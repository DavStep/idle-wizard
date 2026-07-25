#!/usr/bin/env node
/* global Buffer, URL, WebSocket, console, document, fetch, getComputedStyle, process, setTimeout, window */

import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_MANIFEST_PATH,
  REPO_ROOT,
  assertVisualBaselineManifest,
  buildCaptureJobs,
  readVisualBaselineManifest,
  sanitizePathPart,
  settingsVariantId,
} from './manifest.mjs';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:55173/';
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp/visual-baselines/dom');
const BLOCKING_GATE_SELECTOR = [
  '.app-fresh-start-choice:not([hidden])',
  '.first-run-intro:not([hidden])',
  '.app-online-gate:not([hidden])',
].join(',');

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    printHelp();
    return;
  }

  const loaded = readVisualBaselineManifest(options.manifest ?? DEFAULT_MANIFEST_PATH);
  const validation = assertVisualBaselineManifest(loaded.manifest);

  if (options.list) {
    printInventory(loaded.manifest, validation);
    return;
  }

  if (!options.surface) {
    throw new Error('--surface is required unless --list is used.');
  }
  if (!options.state && !options.allStates) {
    throw new Error('--state is required unless --all-states is used.');
  }

  const jobs = buildCaptureJobs(loaded.manifest, {
    surfaceId: options.surface,
    stateId: options.allStates ? undefined : options.state,
    viewportId: options.viewport,
    includeAllVariants: options.allVariants,
  });

  if (jobs.length === 0) {
    throw new Error('No capture jobs matched the requested surface, state, and viewport.');
  }

  const unsupported = jobs.filter(({ automated }) => !automated);
  if (unsupported.length > 0 && !options.dryRun) {
    throw new Error(
      [
        'Requested state is not supported by the generic runner:',
        ...unsupported.map(
          ({ id, recipe }) =>
            `- ${id}: ${recipe.gap ?? recipe.command ?? `recipe kind ${recipe.kind}`}`,
        ),
      ].join('\n'),
    );
  }

  printJobs(jobs, loaded.manifest);
  if (options.dryRun) {
    return;
  }

  const serverUrl = ensureTrailingSlash(options.server ?? DEFAULT_SERVER_URL);
  await assertServerReady(serverUrl);
  const chromePath = resolveChromePath(options.chrome);
  const outputDir = path.resolve(options.out ?? DEFAULT_OUTPUT_DIR);
  const browser = await ChromeSession.launch({
    chromePath,
    width: Math.max(...jobs.map(({ viewport }) => viewport.width)),
    height: Math.max(...jobs.map(({ viewport }) => viewport.height)),
  });

  try {
    const page = await browser.createPage({
      randomSeed: loaded.manifest.source.freeze.randomSeed,
    });
    for (const job of jobs) {
      await captureJob({
        page,
        job,
        manifest: loaded.manifest,
        manifestHash: loaded.hash,
        serverUrl,
        outputDir,
        force: options.force,
        settleMs: options.settleMs,
      });
    }
  } finally {
    await browser.close();
  }
}

export async function captureJob({
  page,
  job,
  manifest,
  manifestHash,
  serverUrl,
  outputDir,
  force = false,
  settleMs,
}) {
  if (job.viewport.adapter !== 'chromium') {
    throw new Error(
      `${job.viewport.id} requires ${job.viewport.adapter}; the Chromium runner cannot capture it.`,
    );
  }

  const variantId = settingsVariantId(manifest, job.settings);
  const jobDir = path.join(
    outputDir,
    sanitizePathPart(job.surface.id),
    sanitizePathPart(job.state.id),
    sanitizePathPart(job.viewport.id),
    variantId,
  );
  const screenshotPath = path.join(jobDir, 'reference.png');
  const metadataPath = path.join(jobDir, 'reference.metadata.json');

  if (!force && (fs.existsSync(screenshotPath) || fs.existsSync(metadataPath))) {
    throw new Error(
      `Refusing to overwrite ${jobDir}; pass --force after reviewing the existing evidence.`,
    );
  }

  await page.setViewport(job.viewport);
  const targetUrl = createRecipeUrl(serverUrl, job.recipe);
  await page.navigate(targetUrl);
  await page.waitForExpression('document.readyState === "complete"', {
    timeoutMs: 20_000,
  });
  await page.waitForExpression('typeof window.cheats === "object"', {
    timeoutMs: 20_000,
    timeoutMessage:
      'window.cheats was not exposed. Start Vite with VITE_ENABLE_CHEATS=true before capture.',
  });
  await assertNoBlockingGate(page);

  const setupResults = [];
  for (const command of job.recipe.setup ?? []) {
    setupResults.push(await runCheat(page, command.name, command.args ?? []));
  }

  setupResults.push(await applyVisualSettings(page, job.settings));
  const openResult = await openRecipe(page, job);
  if (openResult?.ok === false) {
    throw new Error(
      `Recipe ${job.id} failed: ${JSON.stringify(openResult)}`,
    );
  }

  await assertNoBlockingGate(page);
  const anchors = [
    ...(job.surface.anchors ?? []),
    ...(job.state.anchors ?? []),
  ];
  const glyphEdgeMasks = [
    ...(job.surface.glyphEdgeMasks ?? []),
    ...(job.state.glyphEdgeMasks ?? []),
  ];
  const waitSelector =
    job.recipe.waitFor ??
    anchors.find(({ selector, optional }) => selector && !optional)?.selector ??
    '.game-stage';

  await page.waitForExpression(
    `Boolean(document.querySelector(${JSON.stringify(waitSelector)}))`,
    { timeoutMs: 10_000 },
  );
  await page.waitForFontsAndImages();
  await sleep(Number.isFinite(settleMs) ? settleMs : (job.recipe.settleMs ?? 600));
  const freeze = await page.freezeReadyState();
  const measurement = await page.measure({ anchors, glyphEdgeMasks });

  const missingRequiredAnchors = measurement.anchors.filter(
    ({ found, optional }) => !found && !optional,
  );
  if (missingRequiredAnchors.length > 0) {
    throw new Error(
      `Required anchor(s) missing for ${job.id}: ` +
      missingRequiredAnchors.map(({ id }) => id).join(', '),
    );
  }

  fs.mkdirSync(jobDir, { recursive: true });
  await page.captureScreenshot(screenshotPath);
  const screenshotHash = sha256File(screenshotPath);
  const metadata = {
    schemaVersion: 1,
    evidenceKind: 'real-app-capture',
    sourceRenderer: manifest.source.renderer,
    manifestHash,
    jobId: job.id,
    surfaceId: job.surface.id,
    stateId: job.state.id,
    viewport: {
      id: job.viewport.id,
      width: job.viewport.width,
      height: job.viewport.height,
      deviceScaleFactor: job.viewport.deviceScaleFactor,
    },
    settings: job.settings,
    recipe: job.recipe,
    runtime: {
      url: targetUrl,
      server: serverUrl,
    },
    freeze,
    setupResults,
    openResult,
    anchors: measurement.anchors,
    glyphEdgeMasks: measurement.glyphEdgeMasks,
    screenshot: {
      fileName: path.basename(screenshotPath),
      sha256: screenshotHash,
    },
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`captured ${path.relative(REPO_ROOT, screenshotPath)}`);
  console.log(`recorded ${path.relative(REPO_ROOT, metadataPath)}`);
  return { screenshotPath, metadataPath, metadata };
}

export function parseArgs(args) {
  const parsed = {
    allStates: false,
    allVariants: false,
    dryRun: false,
    force: false,
    list: false,
    viewport: 'authored-1080x2170',
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token === '--all-states') {
      parsed.allStates = true;
      continue;
    }
    if (token === '--all-variants') {
      parsed.allVariants = true;
      continue;
    }
    if (token === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (token === '--force') {
      parsed.force = true;
      continue;
    }
    if (token === '--list') {
      parsed.list = true;
      continue;
    }

    const valueFlags = new Map([
      ['--chrome', 'chrome'],
      ['--manifest', 'manifest'],
      ['--out', 'out'],
      ['--server', 'server'],
      ['--settle-ms', 'settleMs'],
      ['--state', 'state'],
      ['--surface', 'surface'],
      ['--viewport', 'viewport'],
    ]);
    const key = valueFlags.get(token);
    if (!key) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const value = requireValue(args, ++index, token);
    parsed[key] = key === 'settleMs' ? Number(value) : value;
  }

  if (Number.isNaN(parsed.settleMs) || parsed.settleMs < 0) {
    throw new Error('--settle-ms must be a non-negative number.');
  }
  return parsed;
}

function createRecipeUrl(serverUrl, recipe) {
  return new URL(recipe.kind === 'url' ? recipe.path : '.', serverUrl).href;
}

async function openRecipe(page, job) {
  if (job.recipe.kind === 'devUi') {
    return page.run(
      async (surfaceId, options) => {
        const result = await Promise.resolve(window.cheats.openUi(surfaceId, options));
        return result ?? { ok: true };
      },
      job.recipe.surfaceId,
      job.recipe.options ?? {},
    );
  }

  if (job.recipe.kind === 'tutorial') {
    const stepId = job.recipe.stepIdFromState ? job.state.id : job.recipe.stepId;
    return page.run(
      async (targetStepId) => {
        const result = await Promise.resolve(window.cheats.loadTutorialStep(targetStepId));
        return result ?? { ok: true };
      },
      stepId,
    );
  }

  if (job.recipe.kind === 'url') {
    return { ok: true, path: job.recipe.path };
  }

  return {
    ok: false,
    reason: 'unsupported_recipe',
    kind: job.recipe.kind,
  };
}

async function runCheat(page, name, args) {
  const result = await page.run(
    async (methodName, methodArgs) => {
      const method = window.cheats?.[methodName];
      if (typeof method !== 'function') {
        return { ok: false, reason: 'missing_cheat', methodName };
      }
      return (await Promise.resolve(method(...methodArgs))) ?? { ok: true };
    },
    name,
    args,
  );
  if (result?.ok === false) {
    throw new Error(`Setup cheat ${name} failed: ${JSON.stringify(result)}`);
  }
  return { name, args, result };
}

function applyVisualSettings(page, settings) {
  return page.run(async (profile) => {
    const result = await Promise.resolve(window.cheats.setProfile(profile));
    return result ?? { ok: true };
  }, settings);
}

async function assertNoBlockingGate(page) {
  const gate = await page.run((selector) => {
    const element = document.querySelector(selector);
    return element
      ? {
          className: element.className,
          text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 240),
        }
      : null;
  }, BLOCKING_GATE_SELECTOR);
  if (gate) {
    throw new Error(
      [
        `Capture is blocked by ${gate.className}: ${gate.text}`,
        'Use an initialized local QA profile and wait for the server gate to clear.',
        'App-gate states are intentionally listed as recipe gaps until they have dedicated fixtures.',
      ].join('\n'),
    );
  }
}

async function assertServerReady(serverUrl) {
  let response;
  try {
    response = await fetch(serverUrl, { method: 'HEAD' });
  } catch (error) {
    throw new Error(
      `Vite is not reachable at ${serverUrl}. Start it with VITE_ENABLE_CHEATS=true. ` +
      `(${error.message})`,
    );
  }
  if (!response.ok) {
    throw new Error(`Vite returned HTTP ${response.status} at ${serverUrl}.`);
  }
}

function resolveChromePath(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const chromePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!chromePath) {
    throw new Error(
      'Chrome was not found. Pass --chrome <path> or set CHROME_PATH.',
    );
  }
  return chromePath;
}

function printInventory(manifest, validation) {
  console.log(
    `surfaces=${validation.inventory.surfaceCount}, ` +
    `states=${validation.inventory.stateCount}, ` +
    `recipe-gaps=${validation.inventory.manualRecipeCount}, ` +
    `uncaptured=${validation.inventory.uncapturedCount}`,
  );
  for (const surface of manifest.surfaces) {
    const recipeKinds = [
      ...new Set(
        surface.states.map(
          (state) => state.recipe?.kind ?? surface.recipe.kind,
        ),
      ),
    ].join(',');
    console.log(
      `${surface.id}\t${surface.kind}\t${surface.states.length} state(s)\t${recipeKinds}`,
    );
  }
}

function printJobs(jobs, manifest) {
  console.log(`visual baseline jobs: ${jobs.length}`);
  for (const job of jobs) {
    console.log(
      `${job.automated ? 'ready' : 'gap'}\t${job.id}\t` +
      `${settingsVariantId(manifest, job.settings)}`,
    );
  }
}

function printHelp() {
  console.log(`Usage:
  npm run visual:baseline:capture -- --surface <id> --state <id> [options]

Selection:
  --surface <id>             Manifest surface id
  --state <id>               Manifest state id
  --all-states               Select every state for the surface
  --viewport <id>            Viewport (default: authored-1080x2170)
  --all-variants             Expand the surface's declared settings Cartesian product
  --list                     List inventory and recipe readiness

Runtime:
  --server <url>             Existing Vite URL (default: http://127.0.0.1:55173/)
  --chrome <path>            Chrome/Chromium executable
  --settle-ms <number>       Override post-open settle time
  --out <directory>          Output root (default: tmp/visual-baselines/dom)
  --force                    Overwrite an existing job directory
  --dry-run                  Validate and print jobs without starting Chrome
  --manifest <path>          Alternate manifest
  --help                     Show help

The Vite server must expose window.cheats (start it with VITE_ENABLE_CHEATS=true).
The runner never edits the manifest or claims approval; it writes real PNGs and
metadata to the ignored tmp directory for review.`);
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isDirectRun() {
  return (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  );
}

class CapturePage {
  constructor({ client, sessionId }) {
    this.client = client;
    this.sessionId = sessionId;
  }

  async installRandomSeed(seed) {
    const normalizedSeed = Number(seed) >>> 0;
    await this.client.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `(() => {
          let state = ${normalizedSeed || 1};
          Math.random = () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
          };
          Object.defineProperty(globalThis, '__visualBaselineRandomSeed', {
            value: ${normalizedSeed || 1},
            configurable: false,
            enumerable: false,
            writable: false,
          });
        })();`,
      },
      this.sessionId,
    );
  }

  setViewport({ width, height, deviceScaleFactor = 1 }) {
    return this.client.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width,
        height,
        deviceScaleFactor,
        mobile: false,
        screenWidth: width,
        screenHeight: height,
      },
      this.sessionId,
    );
  }

  async navigate(url) {
    await this.client.send('Page.navigate', { url }, this.sessionId);
    await sleep(100);
  }

  run(fn, ...args) {
    return this.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`);
  }

  async evaluate(expression, timeout = 10_000) {
    const result = await this.client.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
        timeout,
      },
      this.sessionId,
    );
    if (result.exceptionDetails) {
      const detail =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.exception?.value ??
        result.exceptionDetails.text ??
        'Runtime.evaluate failed';
      throw new Error(String(detail));
    }
    return result.result?.value;
  }

  async waitForExpression(
    expression,
    {
      timeoutMs = 10_000,
      timeoutMessage = null,
    } = {},
  ) {
    const deadline = Date.now() + timeoutMs;
    let lastValue;
    let lastError;

    while (Date.now() < deadline) {
      try {
        lastValue = await this.evaluate(expression, Math.min(timeoutMs, 5_000));
        if (lastValue) {
          return lastValue;
        }
      } catch (error) {
        lastError = error;
      }
      await sleep(100);
    }

    throw new Error(
      timeoutMessage ??
      `Timed out waiting for ${expression}; ` +
      `last=${JSON.stringify(lastValue)}${lastError ? `, error=${lastError.message}` : ''}`,
    );
  }

  async waitForFontsAndImages() {
    await this.run(async () => {
      await document.fonts?.ready;
      const visibleImages = [...document.images].filter(
        (image) => !image.closest('[hidden]'),
      );
      await Promise.all(
        visibleImages.map((image) => {
          if (image.complete && image.naturalWidth > 0) {
            return Promise.resolve();
          }
          return image.decode?.().catch(() => undefined) ?? Promise.resolve();
        }),
      );
      return true;
    });
  }

  async freezeReadyState() {
    const state = await this.run(() => {
      const frozenAtMs = Date.now();
      if (!globalThis.__visualBaselineOriginalDateNow) {
        Object.defineProperty(globalThis, '__visualBaselineOriginalDateNow', {
          value: Date.now,
          configurable: false,
          enumerable: false,
          writable: false,
        });
      }
      Date.now = () => frozenAtMs;
      return {
        frozenAtMs,
        randomSeed: globalThis.__visualBaselineRandomSeed ?? null,
      };
    });
    await this.client.send('Animation.enable', {}, this.sessionId);
    await this.client.send(
      'Animation.setPlaybackRate',
      { playbackRate: 0 },
      this.sessionId,
    );
    return {
      ...state,
      cssAnimationPlaybackRate: 0,
      requestAnimationFrame: 'not-forced',
    };
  }

  measure({ anchors, glyphEdgeMasks }) {
    return this.run(
      ({ anchorDefinitions, maskDefinitions }) => {
        const round = (value) => Math.round(value * 1000) / 1000;
        const rectOf = (rect) => ({
          x: round(rect.x),
          y: round(rect.y),
          width: round(rect.width),
          height: round(rect.height),
          top: round(rect.top),
          right: round(rect.right),
          bottom: round(rect.bottom),
          left: round(rect.left),
        });
        const isVisible = (element) => {
          if (!element || element.closest('[hidden]')) {
            return false;
          }
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity) !== 0 &&
            rect.width > 0 &&
            rect.height > 0
          );
        };
        const resolveSemanticRect = (semanticId) => {
          const registries = [
            globalThis.pixiUiRegistry,
            globalThis.uiSemanticRegistry,
            globalThis.__idleWizardVisualRegistry,
          ].filter(Boolean);
          for (const registry of registries) {
            const value =
              registry.getBounds?.(semanticId) ??
              registry.get?.(semanticId)?.getBounds?.() ??
              registry.get?.(semanticId)?.bounds;
            if (value) {
              return rectOf({
                x: value.x,
                y: value.y,
                width: value.width,
                height: value.height,
                top: value.y,
                right: value.x + value.width,
                bottom: value.y + value.height,
                left: value.x,
              });
            }
          }
          return null;
        };
        const measuredAnchors = anchorDefinitions.map((definition) => {
          const element = definition.selector
            ? [...document.querySelectorAll(definition.selector)].find(isVisible)
            : null;
          const rect = element
            ? rectOf(element.getBoundingClientRect())
            : resolveSemanticRect(definition.semanticId);
          const style = element ? getComputedStyle(element) : null;
          return {
            id: definition.id,
            found: Boolean(rect),
            optional: Boolean(definition.optional),
            selector: definition.selector ?? null,
            semanticId: definition.semanticId ?? null,
            tolerancePx: definition.tolerancePx,
            rect,
            text: element?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
            typography: style
              ? {
                  fontFamily: style.fontFamily,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  lineHeight: style.lineHeight,
                  letterSpacing: style.letterSpacing,
                }
              : null,
          };
        });
        const measuredMasks = maskDefinitions.map((definition) => {
          const padding = Number(definition.padding) || 0;
          const elements = definition.selector
            ? [...document.querySelectorAll(definition.selector)].filter(isVisible)
            : [];
          const rects =
            elements.length > 0
              ? elements.map((element) => {
                  const rect = element.getBoundingClientRect();
                  return {
                    x: round(rect.x - padding),
                    y: round(rect.y - padding),
                    width: round(rect.width + padding * 2),
                    height: round(rect.height + padding * 2),
                  };
                })
              : definition.rect
                ? [definition.rect]
                : [];
          return {
            id: definition.id,
            selector: definition.selector ?? null,
            maxChannelDelta: definition.maxChannelDelta,
            rects,
          };
        });
        return {
          anchors: measuredAnchors,
          glyphEdgeMasks: measuredMasks,
        };
      },
      {
        anchorDefinitions: anchors,
        maskDefinitions: glyphEdgeMasks,
      },
    );
  }

  async captureScreenshot(filePath) {
    const { data } = await this.client.send(
      'Page.captureScreenshot',
      {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      },
      this.sessionId,
    );
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  }
}

class ChromeSession {
  static async launch({ chromePath, width, height }) {
    const port = await getFreePort();
    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'idle-wizard-visual-baseline-'),
    );
    const processRef = spawn(
      chromePath,
      [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-sync',
        '--disable-features=Translate,MediaRouter',
        '--hide-scrollbars',
        `--window-size=${width},${height}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    processRef.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    let version;
    try {
      version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      processRef.kill('SIGTERM');
      fs.rmSync(userDataDir, { recursive: true, force: true });
      throw new Error(`${error.message}\nChrome stderr:\n${stderr}`);
    }
    const client = new CdpClient(version.webSocketDebuggerUrl);
    await client.open();
    return new ChromeSession({ client, processRef, userDataDir });
  }

  constructor({ client, processRef, userDataDir }) {
    this.client = client;
    this.processRef = processRef;
    this.userDataDir = userDataDir;
  }

  async createPage({ randomSeed }) {
    const { targetId } = await this.client.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await this.client.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await this.client.send('Page.enable', {}, sessionId);
    await this.client.send('Runtime.enable', {}, sessionId);
    const page = new CapturePage({ client: this.client, sessionId });
    await page.installRandomSeed(randomSeed);
    return page;
  }

  async close() {
    this.client.close();
    this.processRef.kill('SIGTERM');
    await sleep(250);
    fs.rmSync(this.userDataDir, { recursive: true, force: true });
  }
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  async open() {
    this.socket = new WebSocket(this.wsUrl);
    this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (!message.id) {
      return;
    }
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      return;
    }
    pending.resolve(message.result ?? {});
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError ?? new Error(`Timed out fetching ${url}.`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

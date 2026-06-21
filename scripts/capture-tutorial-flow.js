#!/usr/bin/env node
/* global console, process, fetch, Buffer, WebSocket, setTimeout */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = 'http://127.0.0.1:55173/';
const VIEWPORT = { width: 1080, height: 2170 };
const OUT_DIR = path.join(ROOT, 'docs/tutorial-flow/screenshots');
const CONTACT_SHEET_PATH = path.join(ROOT, 'docs/tutorial-flow/contact-sheet.png');
const CONTACT_SHEET_URL = 'http://127.0.0.1:55173/docs/tutorial-flow/contact-sheet.html';
const CAPTURE_USERNAME = 'Mira';

const FLOW_STEPS = [
  'purchase-house',
  'intro-welcome',
  'intro-username',
  'intro-username-return',
  'intro-mana-sphere',
  'first-summon-seed',
  'first-fill-seed-task',
  'finish-seed-task',
  'intro-market',
  'prepare-seed-sale',
  'open-market',
  'select-market-stand',
  'select-sage-seed-sale',
  'earn-tutorial-gold',
  'level-up-one',
  'intro-garden',
  'grow-sage',
  'fill-sage-seed-task',
  'fill-sage-herb-task',
  'level-up-two',
  'intro-research',
  'research-mint-seed',
  'fill-mint-seed-task',
  'fill-mint-herb-task',
  'level-up-three',
  'research-mana-tonic',
  'intro-brewing',
  'brew-mana-tonic',
  'refill-mana-tonic-cauldron',
];

const STEP_ACTIONS = {
  'purchase-house': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'intro-welcome': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'intro-username': async (page) => {
    await page.setUsername(CAPTURE_USERNAME);
  },
  'intro-username-return': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'intro-mana-sphere': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
    await page.cheat('fillMana');
  },
  'first-summon-seed': async (page) => {
    await page.clickTarget('workshop:summonSeed');
  },
  'first-fill-seed-task': async (page) => {
    await page.ensureTasksExpanded();
    await page.clickActiveTarget();
  },
  'finish-seed-task': async (page) => {
    await page.ensureTasksExpanded();
    await page.completeCurrentTask('level1-sage-seeds');
  },
  'intro-market': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
    await page.cheat('fillMana');
  },
  'prepare-seed-sale': async (page) => {
    await page.clickTarget('workshop:summonSeed');
  },
  'open-market': async (page) => {
    await page.clickTarget('page:shop');
  },
  'select-market-stand': async (page) => {
    await page.clickTarget('shop:directSell');
  },
  'select-sage-seed-sale': async (page) => {
    await page.ensureShopDirectSellPopup();
    await page.clickTarget('shop:directSell:sageSeed');
  },
  'earn-tutorial-gold': async (page) => {
    await page.clickTarget('shop:directSell:sell');
  },
  'level-up-one': async (page) => {
    await page.clickTarget('page:workshop');
    await page.ensureTasksExpanded();
    await page.clickActiveTarget();
    await page.cheat('addItem', 'sageSeed', 1);
  },
  'intro-garden': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'grow-sage': async (page) => {
    await page.clickTarget('page:garden');
    await page.cheat('addItem', 'sageHerb', 3);
    await page.cheat('addItem', 'sageSeed', 10);
  },
  'fill-sage-seed-task': async (page) => {
    await page.clickTarget('page:workshop');
    await page.ensureTasksExpanded();
    await page.completeCurrentTask('level2-sage-seeds');
  },
  'fill-sage-herb-task': async (page) => {
    await page.clickTarget('page:workshop');
    await page.ensureTasksExpanded();
    await page.completeCurrentTask('level2-sage-herb');
    await page.cheat('addGold', 40);
  },
  'level-up-two': async (page) => {
    await page.ensureTasksExpanded();
    await page.clickActiveTarget();
  },
  'intro-research': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'research-mint-seed': async (page) => {
    await page.clickTarget('page:research');
    await page.cheat('completeResearch', 'unlockSeed:mintSeed');
    await page.cheat('addItem', 'mintSeed', 10);
  },
  'fill-mint-seed-task': async (page) => {
    await page.clickTarget('page:workshop');
    await page.ensureTasksExpanded();
    await page.completeCurrentTask('level3-sage-seeds');
    await page.completeCurrentTask('level3-mint-seeds');
  },
  'fill-mint-herb-task': async (page) => {
    await page.clickTarget('page:garden');
    await page.cheat('addItem', 'mintHerb', 18);
    await page.clickTarget('page:workshop');
    await page.ensureTasksExpanded();
    await page.completeCurrentTask('level3-mint-herb');
    await page.cheat('addGold', 80);
  },
  'level-up-three': async (page) => {
    await page.ensureTasksExpanded();
    await page.clickActiveTarget();
  },
  'research-mana-tonic': async (page) => {
    await page.clickTarget('page:research');
    await page.cheat('completeResearch', 'unlockRecipe:manaTonic');
    await page.cheat('addItem', 'sageHerb', 6);
    await page.cheat('fillMana');
  },
  'intro-brewing': async (page) => {
    await page.clickSelector('.tutorial-layer__lesson-advance:not([hidden])');
  },
  'brew-mana-tonic': async (page) => {
    await page.clickTarget('page:brewing');
    await page.cheat('addItem', 'manaTonic', 1);
  },
  'refill-mana-tonic-cauldron': async (page) => {
    await page.clickTarget('page:brewing');
    await page.clickTarget('brewing:herb:sageHerb');
    await page.clickTarget('brewing:herb:sageHerb');
    await page.clickTarget('brewing:herb:sageHerb');
    await page.cheat('fillMana');
    await page.clickTarget('brewing:action');
  },
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  assertChromeExists();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  removeOldScreenshots();

  const server = await ensureDevServer();
  const browser = await ChromeSession.launch();

  try {
    const page = await browser.createPage();
    await page.setViewport(VIEWPORT.width, VIEWPORT.height);
    await page.navigate(APP_URL);
    await page.waitForExpression(
      `typeof window.tutorialCapture === 'object' && typeof window.cheats === 'object'`,
      { timeoutMs: 20_000 },
    );
    await page.run(() => {
      window.localStorage.removeItem('idle-wizard.tutorial.v4');
    });
    await page.navigate(APP_URL);
    await page.waitForExpression(
      `typeof window.tutorialCapture === 'object' && typeof window.cheats === 'object'`,
      { timeoutMs: 20_000 },
    );
    await page.startFresh();
    await page.waitForStep(FLOW_STEPS[0]);

    const captures = [];

    for (const stepId of FLOW_STEPS) {
      await page.waitForStep(stepId);
      await prepareStepForCapture(page, stepId);
      const state = await page.getState();
      const index = captures.length + 1;
      const fileName = `${String(index).padStart(2, '0')}-${stepId}.png`;

      await page.assertNoHighlightBox();
      await page.captureScreenshot(path.join(OUT_DIR, fileName));
      captures.push({
        index,
        id: stepId,
        fileName,
        source: 'real-game',
        step: state.activeStep?.id ?? null,
        lesson: state.lessonText,
        progress: state.activeStep?.progressLabel ?? '',
        targetId: state.activeStep?.targetId ?? null,
        page: state.currentPageId,
        pointerVisible: state.pointerVisible,
      });
      console.log(`captured ${fileName}`);

      const action = STEP_ACTIONS[stepId];
      if (action) {
        await action(page);
      }
    }

    await page.waitForExpression(
      `typeof window.tutorialCapture === 'object' && window.tutorialCapture.getState().activeStep === null`,
      { timeoutMs: 10_000 },
    );

    fs.writeFileSync(
      path.join(OUT_DIR, 'capture-index.json'),
      `${JSON.stringify(captures, null, 2)}\n`,
    );
    await page.setViewport(1800, 2600);
    await page.navigate(CONTACT_SHEET_URL);
    await page.waitForExpression(
      `document.querySelectorAll('#grid figure').length === ${captures.length} && Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0)`,
      { timeoutMs: 10_000 },
    );
    await page.captureFullPage(CONTACT_SHEET_PATH);
    console.log(`captured ${path.relative(ROOT, CONTACT_SHEET_PATH)}`);
  } finally {
    await browser.close();
    await server.stopIfOwned();
  }
}

async function prepareStepForCapture(page, stepId) {
  await page.hideOnlineGate();
  await page.openLessonPanel();

  switch (stepId) {
    case 'first-fill-seed-task':
    case 'finish-seed-task':
    case 'level-up-one':
    case 'fill-sage-seed-task':
    case 'fill-sage-herb-task':
    case 'level-up-two':
    case 'fill-mint-seed-task':
    case 'level-up-three':
      await page.ensurePage('workshop');
      await page.ensureTasksExpanded();
      break;
    case 'select-sage-seed-sale':
    case 'earn-tutorial-gold':
      await page.ensurePage('shop');
      await page.ensureShopDirectSellPopup();
      break;
    case 'grow-sage':
    case 'fill-mint-herb-task':
      await page.ensurePage('garden');
      break;
    case 'research-mint-seed':
    case 'research-mana-tonic':
      await page.ensurePage('research');
      break;
    case 'brew-mana-tonic':
    case 'refill-mana-tonic-cauldron':
      await page.ensurePage('brewing');
      break;
    default:
      break;
  }

  await page.hideOnlineGate();
  await page.openLessonPanel();
  await page.waitForStep(stepId);
  await page.waitForLessonText();
  await page.waitForImages();
}

async function ensureDevServer() {
  if (!(await isServerReachable())) {
    const proc = spawn('npm', ['run', 'dev'], {
      cwd: ROOT,
      env: {
        ...process.env,
        VITE_ENABLE_CHEATS: 'true',
        VITE_ENABLE_TUTORIAL_CAPTURE: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (chunk) => process.stdout.write(chunk));
    proc.stderr.on('data', (chunk) => process.stderr.write(chunk));
    await waitForServer();
    return {
      async stopIfOwned() {
        proc.kill('SIGTERM');
        await sleep(250);
      },
    };
  }

  return {
    async stopIfOwned() {},
  };
}

async function isServerReachable() {
  try {
    const response = await fetch(APP_URL, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (await isServerReachable()) {
      return;
    }

    await sleep(200);
  }

  throw new Error('Timed out waiting for Vite on http://127.0.0.1:55173/.');
}

function removeOldScreenshots() {
  for (const entry of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (entry.isFile() && /^\d{2}-.*\.png$/.test(entry.name)) {
      fs.rmSync(path.join(OUT_DIR, entry.name));
    }
  }
}

function assertChromeExists() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at ${CHROME_PATH}.`);
  }
}

class TutorialPage {
  constructor({ client, sessionId }) {
    this.client = client;
    this.sessionId = sessionId;
  }

  setViewport(width, height) {
    return this.client.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: width,
        screenHeight: height,
      },
      this.sessionId,
    );
  }

  navigate(url) {
    return this.client.send('Page.navigate', { url }, this.sessionId);
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

  async waitForExpression(expression, { timeoutMs = 10_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastValue;

    while (Date.now() < deadline) {
      lastValue = await this.evaluate(expression, Math.min(timeoutMs, 5_000));
      if (lastValue) {
        return lastValue;
      }

      await sleep(100);
    }

    throw new Error(`Timed out waiting for ${expression}; last=${JSON.stringify(lastValue)}`);
  }

  getState() {
    return this.run(() => window.tutorialCapture?.getState?.() ?? null);
  }

  hideOnlineGate() {
    return this.run(() => window.tutorialCapture.hideOnlineGate());
  }

  openLessonPanel() {
    return this.run(() => window.tutorialCapture.openLessonPanel());
  }

  async startFresh() {
    const result = await this.run(() => {
      window.tutorialCapture.hideOnlineGate();
      const state = window.tutorialCapture.getState();
      if (state.freshStartVisible) {
        return window.tutorialCapture.startFresh();
      }

      return { ok: true, skipped: true };
    });
    if (!result?.ok) {
      throw new Error(`Failed to start fresh: ${JSON.stringify(result ?? null)}`);
    }

    await sleep(500);
    await this.hideOnlineGate();
    const state = await this.getState();

    if (state.freshStartVisible) {
      const fallback = await this.run(() =>
        window.tutorialCapture.clickByText('start fresh', 'button'),
      );

      if (!fallback?.ok) {
        throw new Error(
          `Failed to start fresh with fallback: ${JSON.stringify(fallback ?? null)}`,
        );
      }

      await sleep(500);
      await this.hideOnlineGate();
    }
  }

  async waitForStep(stepId, { timeoutMs = 10_000 } = {}) {
    try {
      await this.waitForExpression(
        `typeof window.tutorialCapture === 'object' && window.tutorialCapture.getState().activeStep?.id === ${JSON.stringify(stepId)}`,
        { timeoutMs },
      );
    } catch (error) {
      const state = await this.getState();
      throw new Error(
        `${error.message}; state=${JSON.stringify({
          activeStep: state.activeStep,
          currentPageId: state.currentPageId,
          freshStartVisible: state.freshStartVisible,
          onlineGateVisible: state.onlineGateVisible,
          completedStepIds: state.completedStepIds,
          snapshot: state.snapshot,
        })}`,
      );
    }
    await this.hideOnlineGate();
    return this.getState();
  }

  async ensurePage(pageId) {
    const state = await this.getState();
    if (state.currentPageId === pageId) {
      return;
    }

    await this.clickTarget(`page:${pageId}`);
    await this.waitForExpression(
      `typeof window.tutorialCapture === 'object' && window.tutorialCapture.getState().currentPageId === ${JSON.stringify(pageId)}`,
    );
  }

  async ensureTasksExpanded() {
    const expanded = await this.run(
      () => {
        const toggle = document.querySelector('.workshop-page__tasks-toggle');

        if (toggle) {
          return toggle.hidden || toggle.getAttribute('aria-expanded') === 'true';
        }

        return (
          document
            .querySelector('[data-tutorial-id="workshop:tasks"]')
            ?.getAttribute('aria-expanded') === 'true'
        );
      },
    );

    if (!expanded) {
      await this.clickTarget('workshop:tasks');
      await this.waitForExpression(
        `document.querySelector('[data-tutorial-id="workshop:tasks"]')?.getAttribute('aria-expanded') === 'true'`,
      );
    }
  }

  async ensureShopDirectSellPopup() {
    const open = await this.run(
      () => Boolean(document.querySelector('.shop-page__direct-sell-popup:not([hidden])')),
    );

    if (!open) {
      await this.clickTarget('shop:directSell');
      await this.waitForExpression(
        `Boolean(document.querySelector('.shop-page__direct-sell-popup:not([hidden])'))`,
      );
    }
  }

  async clickActiveTarget() {
    const state = await this.getState();
    const targetId = state.activeStep?.targetId;

    if (!targetId) {
      throw new Error(`No active target for ${state.activeStep?.id ?? 'unknown step'}.`);
    }

    await this.clickTarget(targetId);
  }

  async clickTarget(targetId) {
    const result = await this.run((id) => window.tutorialCapture.clickTarget(id), targetId);
    if (!result?.ok) {
      throw new Error(`Failed to click target ${targetId}: ${result?.reason ?? 'unknown'}`);
    }
    await sleep(150);
    await this.hideOnlineGate();
  }

  async setUsername(username) {
    const result = await this.run((value) => window.tutorialCapture.setUsername(value), username);

    if (!result?.ok) {
      throw new Error(`Failed to set username: ${JSON.stringify(result ?? null)}`);
    }

    await sleep(250);
    await this.hideOnlineGate();
    await this.waitForExpression(
      `typeof window.tutorialCapture === 'object' && window.tutorialCapture.getState().username === ${JSON.stringify(username)}`,
      { timeoutMs: 5_000 },
    );
  }

  async clickSelector(selector) {
    const result = await this.run(
      (targetSelector) => window.tutorialCapture.clickSelector(targetSelector),
      selector,
    );
    if (!result?.ok) {
      throw new Error(`Failed to click selector ${selector}: ${result?.reason ?? 'unknown'}`);
    }
    await sleep(150);
    await this.hideOnlineGate();
  }

  async cheat(name, ...args) {
    const result = await this.run(
      (methodName, methodArgs) => {
        const method = window.cheats?.[methodName];
        if (typeof method !== 'function') {
          return { ok: false, reason: 'missing_cheat', methodName };
        }

        const value = method(...methodArgs);
        window.tutorialCapture.refreshTutorial();
        return value;
      },
      name,
      args,
    );

    if (result?.ok === false) {
      throw new Error(`Cheat ${name} failed: ${result.reason ?? 'unknown'}`);
    }

    await sleep(100);
    await this.hideOnlineGate();
    return result;
  }

  async completeTaskWithItems(taskId, itemKey, quantity) {
    const result = await this.run(
      (id, key, amount) => window.tutorialCapture.completeTaskWithItems(id, key, amount),
      taskId,
      itemKey,
      quantity,
    );

    if (!result?.ok) {
      throw new Error(
        `Failed to complete task ${taskId}: ${JSON.stringify(result ?? null)}`,
      );
    }

    await sleep(150);
    await this.hideOnlineGate();
    return result;
  }

  async completeCurrentTask(taskId) {
    const result = await this.run((id) => window.tutorialCapture.completeCurrentTask(id), taskId);

    if (!result?.ok) {
      throw new Error(
        `Failed to complete current task ${taskId}: ${JSON.stringify(result ?? null)}`,
      );
    }

    await sleep(150);
    await this.hideOnlineGate();
    return result;
  }

  waitForImages() {
    return this.waitForExpression(
      `Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0)`,
    );
  }

  waitForLessonText() {
    return this.waitForExpression(
      `(() => {
        const text = document.querySelector('.tutorial-layer__lesson-text');
        if (!text || text.closest('[hidden]')) {
          return true;
        }

        const fullText = text.dataset.tutorialFullText;
        return !fullText || text.textContent === fullText;
      })()`,
      { timeoutMs: 10_000 },
    );
  }

  assertNoHighlightBox() {
    return this.waitForExpression(
      `document.querySelectorAll('.tutorial-layer__highlight').length === 0`,
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

  async captureFullPage(filePath) {
    const metrics = await this.client.send('Page.getLayoutMetrics', {}, this.sessionId);
    const size = metrics.cssContentSize ?? metrics.contentSize;
    const { data } = await this.client.send(
      'Page.captureScreenshot',
      {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: Math.ceil(size.width),
          height: Math.ceil(size.height),
          scale: 1,
        },
      },
      this.sessionId,
    );
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  }
}

class ChromeSession {
  static async launch() {
    const port = await getFreePort();
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idle-wizard-tutorial-'));
    const processRef = spawn(
      CHROME_PATH,
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
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
        'about:blank',
      ],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );

    let stderr = '';
    processRef.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
    const client = new CdpClient(version.webSocketDebuggerUrl);
    await client.open();

    return new ChromeSession({ client, processRef, userDataDir, stderr: () => stderr });
  }

  constructor({ client, processRef, userDataDir, stderr }) {
    this.client = client;
    this.processRef = processRef;
    this.userDataDir = userDataDir;
    this.stderr = stderr;
  }

  async createPage() {
    const { targetId } = await this.client.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.client.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await this.client.send('Page.enable', {}, sessionId);
    await this.client.send('Runtime.enable', {}, sessionId);
    return new TutorialPage({ client: this.client, sessionId });
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

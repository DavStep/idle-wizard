import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DevCheatCommandManager } from '../../src/dev/cheats/managers/DevCheatCommandManager.js';
import { TUTORIAL_STEP_IDS } from '../../src/pages/tutorial/managers/TutorialStepManager.js';
import { PLAYER_COLOR_MODE_OPTIONS } from '../../src/player/playerColorModes.js';
import { PLAYER_FONT_OPTIONS } from '../../src/player/playerFonts.js';
import { PLAYER_ICON_MODE_OPTIONS } from '../../src/player/playerIconModes.js';
import { PLAYER_PLOT_VIEW_OPTIONS } from '../../src/player/playerPlotViews.js';
import { PLAYER_PROGRESS_BAR_OPTIONS } from '../../src/player/playerProgressBars.js';
import { PLAYER_THEME_OPTIONS } from '../../src/player/playerThemes.js';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const DEFAULT_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'scripts/visual-baseline/manifest.json',
);

const REQUIRED_VIEWPORT_IDS = Object.freeze([
  'authored-1080x2170',
  'desktop-fitted-1440x900',
  'android-reference',
]);
const AUTOMATED_RECIPE_KINDS = new Set(['devUi', 'tutorial', 'url']);
const ALLOWED_RECIPE_KINDS = new Set([...AUTOMATED_RECIPE_KINDS, 'external', 'manual']);
const ALLOWED_SURFACE_KINDS = new Set([
  'app-gate',
  'chrome',
  'dialog',
  'effect',
  'intro',
  'page',
  'preview',
  'tool',
  'tutorial',
]);
const ALLOWED_BASELINE_STATUSES = new Set(['uncaptured', 'captured', 'approved']);

const SOURCE_SETTING_OPTIONS = Object.freeze({
  theme: PLAYER_THEME_OPTIONS.map(({ key }) => key),
  font: PLAYER_FONT_OPTIONS.map(({ key }) => key),
  colorMode: PLAYER_COLOR_MODE_OPTIONS.map(({ key }) => key),
  iconMode: PLAYER_ICON_MODE_OPTIONS.map(({ key }) => key),
  progressBar: PLAYER_PROGRESS_BAR_OPTIONS.map(({ key }) => key),
  plotView: PLAYER_PLOT_VIEW_OPTIONS.map(({ key }) => key),
});

export function readVisualBaselineManifest(filePath = DEFAULT_MANIFEST_PATH) {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  return {
    filePath: resolvedPath,
    raw,
    hash: crypto.createHash('sha256').update(raw).digest('hex'),
    manifest: JSON.parse(raw),
  };
}

export function validateVisualBaselineManifest(
  manifest,
  {
    rootDir = REPO_ROOT,
    strictCaptureReady = false,
  } = {},
) {
  const errors = [];
  const warnings = [];
  const addError = (message) => errors.push(message);
  const addWarning = (message) => warnings.push(message);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      errors: ['Manifest must be a JSON object.'],
      warnings,
      inventory: createEmptyInventory(),
    };
  }

  if (manifest.schemaVersion !== 1) {
    addError('schemaVersion must be 1.');
  }

  if (manifest.source?.renderer !== 'dom') {
    addError('source.renderer must be "dom" until the retained Pixi cutover is approved.');
  }

  const viewports = indexById(manifest.viewports, 'viewports', addError);
  for (const viewportId of REQUIRED_VIEWPORT_IDS) {
    if (!viewports.has(viewportId)) {
      addError(`Required viewport is missing: ${viewportId}.`);
    }
  }

  for (const viewport of viewports.values()) {
    if (viewport.adapter === 'android-placeholder') {
      if (viewport.status !== 'placeholder') {
        addError(`${viewport.id} must remain status "placeholder" until a device is recorded.`);
      }
      if (!viewport.device || typeof viewport.device.notes !== 'string') {
        addError(`${viewport.id} must include Android placeholder device metadata.`);
      }
      continue;
    }

    if (!isPositiveInteger(viewport.width) || !isPositiveInteger(viewport.height)) {
      addError(`${viewport.id} must have positive integer width and height.`);
    }
  }

  validateSettingAxes(manifest.settings, addError);

  const surfaces = indexById(manifest.surfaces, 'surfaces', addError);
  const coverage = {
    pages: new Set(),
    devUi: new Set(),
    globalOwners: new Set(),
    domSelectors: new Set(),
    tutorialSteps: new Set(),
  };
  const uncaptured = [];
  const manual = [];

  for (const surface of surfaces.values()) {
    validateSurface({
      surface,
      manifest,
      viewports,
      addError,
      addWarning,
      rootDir,
      strictCaptureReady,
      coverage,
      uncaptured,
      manual,
    });
  }

  const inventory = discoverSourceInventory({ rootDir });
  compareCoverage('page', inventory.pages, coverage.pages, addError);
  compareCoverage('dev UI recipe', inventory.devUi, coverage.devUi, addError);
  compareCoverage('mounted global owner', inventory.globalOwners, coverage.globalOwners, addError);
  compareCoverage(
    'production style-dialog selector',
    inventory.domSelectors,
    coverage.domSelectors,
    addError,
  );
  compareCoverage(
    'tutorial step',
    inventory.tutorialSteps,
    coverage.tutorialSteps,
    addError,
  );

  for (const [axisId, sourceValues] of Object.entries(inventory.settingOptions)) {
    const manifestValues = manifest.settings?.axes?.[axisId]?.values ?? [];
    compareExactValues(`visual setting axis ${axisId}`, sourceValues, manifestValues, addError);
  }

  if (uncaptured.length > 0) {
    addWarning(
      `${uncaptured.length} manifest state(s) are inventory-only and have no claimed golden capture.`,
    );
  }

  if (manual.length > 0) {
    const message =
      `${manual.length} state(s) still require a deterministic recipe: ` +
      `${manual.slice(0, 12).join(', ')}${manual.length > 12 ? ', …' : ''}.`;
    if (strictCaptureReady) {
      addError(message);
    } else {
      addWarning(message);
    }
  }

  return {
    errors,
    warnings,
    inventory: {
      ...inventory,
      surfaceCount: surfaces.size,
      stateCount: [...surfaces.values()].reduce(
        (total, surface) => total + (surface.states?.length ?? 0),
        0,
      ),
      uncapturedCount: uncaptured.length,
      manualRecipeCount: manual.length,
    },
  };
}

export function assertVisualBaselineManifest(manifest, options) {
  const result = validateVisualBaselineManifest(manifest, options);
  if (result.errors.length > 0) {
    throw new Error(result.errors.join('\n'));
  }
  return result;
}

export function discoverSourceInventory({ rootDir = REPO_ROOT } = {}) {
  const pagesFacadePath = path.join(rootDir, 'src/pages/PagesFacade.js');
  const lifecyclePath = path.join(rootDir, 'src/app/managers/AppLifecycleManager.js');
  const pagesSource = fs.readFileSync(pagesFacadePath, 'utf8');
  const lifecycleSource = fs.readFileSync(lifecyclePath, 'utf8');

  const pages = uniqueSorted(
    [...pagesSource.matchAll(/registryManager\.register\(\s*['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    ),
  );
  const devUi = uniqueSorted(
    new DevCheatCommandManager()
      .listUiSurfaces()
      .surfaces.map(({ id }) => id),
  );
  const globalOwners = uniqueSorted([
    ...extractMountedOwners(lifecycleSource, {
      include: /(GateManager|ChoiceManager|RefreshManager)$/,
    }),
    ...extractMountedOwners(pagesSource, {
      exclude: new Set([
        'currentPageManager',
        'pressFeedbackManager',
        'scrollCueManager',
        'swipeNavigationManager',
      ]),
    }),
  ]);

  return {
    pages,
    devUi,
    globalOwners,
    domSelectors: discoverStyleDialogSelectors({ rootDir }),
    tutorialSteps: uniqueSorted(TUTORIAL_STEP_IDS),
    settingOptions: SOURCE_SETTING_OPTIONS,
  };
}

export function buildCaptureJobs(
  manifest,
  {
    surfaceId,
    stateId,
    viewportId,
    includeAllVariants = false,
    includePlaceholderViewports = false,
  } = {},
) {
  const surfaces = (manifest.surfaces ?? []).filter(
    (surface) => !surfaceId || surface.id === surfaceId,
  );
  const viewports = new Map((manifest.viewports ?? []).map((viewport) => [viewport.id, viewport]));
  const jobs = [];

  for (const surface of surfaces) {
    const states = (surface.states ?? []).filter((state) => !stateId || state.id === stateId);
    const variants = createSettingsVariants(manifest, surface, {
      includeAllVariants,
    });

    for (const state of states) {
      const recipe = {
        ...(surface.recipe ?? {}),
        ...(state.recipe ?? {}),
      };

      for (
        const candidateViewportId of
          surface.viewports ?? manifest.surfaceDefaults?.viewports ?? []
      ) {
        if (viewportId && candidateViewportId !== viewportId) {
          continue;
        }

        const viewport = viewports.get(candidateViewportId);
        if (!viewport) {
          continue;
        }
        if (viewport.adapter === 'android-placeholder' && !includePlaceholderViewports) {
          continue;
        }

        for (const settings of variants) {
          jobs.push({
            id: [
              surface.id,
              state.id,
              viewport.id,
              settingsVariantId(manifest, settings),
            ].join('/'),
            surface,
            state,
            viewport,
            recipe,
            settings,
            automated: AUTOMATED_RECIPE_KINDS.has(recipe.kind),
          });
        }
      }
    }
  }

  return jobs;
}

export function resolveSurfaceState(manifest, surfaceId, stateId) {
  const surface = manifest.surfaces?.find(({ id }) => id === surfaceId);
  if (!surface) {
    throw new Error(`Unknown visual baseline surface: ${surfaceId}.`);
  }

  const state = surface.states?.find(({ id }) => id === stateId);
  if (!state) {
    throw new Error(`Unknown visual baseline state: ${surfaceId}/${stateId}.`);
  }

  return { surface, state };
}

export function settingsVariantId(manifest, settings = {}) {
  return Object.keys(manifest.settings?.axes ?? {})
    .filter((axisId) => Object.hasOwn(settings, axisId))
    .map((axisId) => `${axisId}-${sanitizePathPart(settings[axisId])}`)
    .join('__') || 'default';
}

export function sanitizePathPart(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';
}

function validateSurface({
  surface,
  manifest,
  viewports,
  addError,
  addWarning,
  rootDir,
  strictCaptureReady,
  coverage,
  uncaptured,
  manual,
}) {
  if (!ALLOWED_SURFACE_KINDS.has(surface.kind)) {
    addError(`${surface.id} has unsupported kind ${JSON.stringify(surface.kind)}.`);
  }

  const surfaceViewports = new Set(
    surface.viewports ?? manifest.surfaceDefaults?.viewports ?? [],
  );
  for (const viewportId of REQUIRED_VIEWPORT_IDS) {
    if (surface.production !== false && !surfaceViewports.has(viewportId)) {
      addError(`${surface.id} must cover required viewport ${viewportId}.`);
    }
  }
  for (const viewportId of surfaceViewports) {
    if (!viewports.has(viewportId)) {
      addError(`${surface.id} references unknown viewport ${viewportId}.`);
    }
  }

  validateSettingsCoverage(surface, manifest, addError);
  collectCoverage(surface.coverage, coverage);

  const states = indexById(surface.states, `${surface.id}.states`, addError);
  if (states.size === 0) {
    addError(`${surface.id} must define at least one visual state.`);
  }

  for (const state of states.values()) {
    const recipe = {
      ...(surface.recipe ?? {}),
      ...(state.recipe ?? {}),
    };
    validateRecipe(recipe, `${surface.id}/${state.id}`, addError);
    collectCoverage(state.coverage, coverage);

    if (surface.kind === 'tutorial') {
      coverage.tutorialSteps.add(state.id);
    }

    const baselineStatus = state.baseline?.status ?? 'uncaptured';
    if (!ALLOWED_BASELINE_STATUSES.has(baselineStatus)) {
      addError(`${surface.id}/${state.id} has invalid baseline status ${baselineStatus}.`);
    }

    if (baselineStatus === 'uncaptured') {
      uncaptured.push(`${surface.id}/${state.id}`);
    } else {
      validateClaimedBaseline({
        surface,
        state,
        rootDir,
        addError,
      });
    }

    if (!AUTOMATED_RECIPE_KINDS.has(recipe.kind)) {
      manual.push(`${surface.id}/${state.id}`);
      if (strictCaptureReady && recipe.kind === 'external') {
        addWarning(
          `${surface.id}/${state.id} uses an external capture command rather than the generic runner.`,
        );
      }
    }

    validateAnchors(
      [...(surface.anchors ?? []), ...(state.anchors ?? [])],
      `${surface.id}/${state.id}`,
      addError,
    );
    validateGlyphMasks(
      [...(surface.glyphEdgeMasks ?? []), ...(state.glyphEdgeMasks ?? [])],
      `${surface.id}/${state.id}`,
      addError,
    );
  }
}

function validateSettingAxes(settings, addError) {
  if (!settings?.axes || typeof settings.axes !== 'object') {
    addError('settings.axes must be an object.');
    return;
  }

  for (const [axisId, axis] of Object.entries(settings.axes)) {
    if (!Array.isArray(axis.values) || axis.values.length === 0) {
      addError(`settings.axes.${axisId}.values must be non-empty.`);
      continue;
    }
    if (new Set(axis.values).size !== axis.values.length) {
      addError(`settings.axes.${axisId}.values contains duplicates.`);
    }
    if (!axis.values.includes(axis.default)) {
      addError(`settings.axes.${axisId}.default must be one of its values.`);
    }
  }
}

function validateSettingsCoverage(surface, manifest, addError) {
  const coverage =
    surface.settingsCoverage ??
    manifest.surfaceDefaults?.settingsCoverage ??
    { mode: 'defaults', axes: [] };
  const allowedModes = new Set(['defaults', 'cartesian']);
  if (!allowedModes.has(coverage.mode)) {
    addError(`${surface.id} has invalid settingsCoverage.mode ${coverage.mode}.`);
  }

  for (const axisId of coverage.axes ?? []) {
    if (!manifest.settings?.axes?.[axisId]) {
      addError(`${surface.id} references unknown visual setting axis ${axisId}.`);
    }
  }

  if (
    surface.production !== false &&
    !coverage.axes?.includes('theme')
  ) {
    addError(`${surface.id} must cover all production themes.`);
  }
  if (
    surface.production !== false &&
    !coverage.axes?.includes('font')
  ) {
    addError(`${surface.id} must cover both production fonts.`);
  }
}

function validateRecipe(recipe, label, addError) {
  if (!recipe || typeof recipe !== 'object') {
    addError(`${label} must define a capture recipe.`);
    return;
  }
  if (!ALLOWED_RECIPE_KINDS.has(recipe.kind)) {
    addError(`${label} has unsupported recipe kind ${JSON.stringify(recipe.kind)}.`);
  }
  if (recipe.kind === 'devUi' && !recipe.surfaceId) {
    addError(`${label} devUi recipe requires surfaceId.`);
  }
  if (recipe.kind === 'tutorial' && !recipe.stepIdFromState && !recipe.stepId) {
    addError(`${label} tutorial recipe requires stepId or stepIdFromState.`);
  }
  if (recipe.kind === 'url' && !recipe.path) {
    addError(`${label} URL recipe requires path.`);
  }
  if (recipe.kind === 'external' && !recipe.command) {
    addError(`${label} external recipe requires command.`);
  }
  if (recipe.kind === 'manual' && !recipe.gap) {
    addError(`${label} manual recipe must explain the deterministic-recipe gap.`);
  }
}

function validateAnchors(anchors, label, addError) {
  const seen = new Set();
  for (const anchor of anchors) {
    if (!anchor?.id) {
      addError(`${label} has an anchor without an id.`);
      continue;
    }
    if (seen.has(anchor.id)) {
      addError(`${label} has duplicate anchor id ${anchor.id}.`);
    }
    seen.add(anchor.id);
    if (!anchor.selector && !anchor.semanticId) {
      addError(`${label}/${anchor.id} needs selector or semanticId.`);
    }
    if (!Number.isFinite(anchor.tolerancePx) || anchor.tolerancePx < 0) {
      addError(`${label}/${anchor.id} needs a non-negative tolerancePx.`);
    }
  }
}

function validateGlyphMasks(masks, label, addError) {
  const seen = new Set();
  for (const mask of masks) {
    if (!mask?.id) {
      addError(`${label} has a glyph-edge mask without an id.`);
      continue;
    }
    if (seen.has(mask.id)) {
      addError(`${label} has duplicate glyph-edge mask id ${mask.id}.`);
    }
    seen.add(mask.id);
    if (!mask.selector && !isRect(mask.rect)) {
      addError(`${label}/${mask.id} needs selector or a fixed rect.`);
    }
    if (
      !Number.isFinite(mask.maxChannelDelta) ||
      mask.maxChannelDelta < 0 ||
      mask.maxChannelDelta > 255
    ) {
      addError(`${label}/${mask.id} maxChannelDelta must be between 0 and 255.`);
    }
  }
}

function validateClaimedBaseline({ surface, state, rootDir, addError }) {
  const artifacts = state.baseline?.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    addError(`${surface.id}/${state.id} claims a baseline without artifacts.`);
    return;
  }

  for (const artifact of artifacts) {
    if (!artifact.path || !artifact.sha256) {
      addError(`${surface.id}/${state.id} baseline artifacts need path and sha256.`);
      continue;
    }
    const artifactPath = path.resolve(rootDir, artifact.path);
    if (!fs.existsSync(artifactPath)) {
      addError(`${surface.id}/${state.id} baseline artifact is missing: ${artifact.path}.`);
      continue;
    }
    const hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(artifactPath))
      .digest('hex');
    if (hash !== artifact.sha256) {
      addError(`${surface.id}/${state.id} baseline checksum does not match ${artifact.path}.`);
    }
  }
}

function collectCoverage(source = {}, target) {
  for (const key of Object.keys(target)) {
    for (const value of source[key] ?? []) {
      target[key].add(value);
    }
  }
}

function compareCoverage(label, expected, actualSet, addError) {
  const missing = expected.filter((value) => !actualSet.has(value));
  if (missing.length > 0) {
    addError(`Manifest does not cover current ${label}(s): ${missing.join(', ')}.`);
  }

  const expectedSet = new Set(expected);
  const stale = [...actualSet].filter((value) => !expectedSet.has(value));
  if (stale.length > 0) {
    addError(`Manifest references stale ${label}(s): ${stale.sort().join(', ')}.`);
  }
}

function compareExactValues(label, expected, actual, addError) {
  const expectedValues = uniqueSorted(expected);
  const actualValues = uniqueSorted(actual);
  if (JSON.stringify(expectedValues) !== JSON.stringify(actualValues)) {
    addError(
      `${label} drifted: source=[${expectedValues.join(', ')}], ` +
      `manifest=[${actualValues.join(', ')}].`,
    );
  }
}

function discoverStyleDialogSelectors({ rootDir }) {
  const sourceFiles = [
    ...walkJavaScriptFiles(path.join(rootDir, 'src/app')),
    ...walkJavaScriptFiles(path.join(rootDir, 'src/pages')),
  ].filter((filePath) => !filePath.endsWith('.test.js'));
  const selectors = new Set();

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(/className\s*=\s*(['"])([^'"\n]+)\1/g)) {
      const classNames = match[2].trim().split(/\s+/);
      if (!classNames.includes('style-dialog')) {
        continue;
      }
      const semanticClass = classNames.find((className) => !className.startsWith('style-'));
      if (semanticClass) {
        selectors.add(`.${semanticClass}`);
      }
    }
  }

  return uniqueSorted([...selectors]);
}

function walkJavaScriptFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkJavaScriptFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function extractMountedOwners(source, { include = null, exclude = new Set() } = {}) {
  return [...source.matchAll(/this\.(\w+)\??\.mount\(/g)]
    .map((match) => match[1])
    .filter((owner) => !include || include.test(owner))
    .filter((owner) => !exclude.has(owner));
}

function createSettingsVariants(manifest, surface, { includeAllVariants }) {
  const coverage =
    surface.settingsCoverage ??
    manifest.surfaceDefaults?.settingsCoverage ??
    { mode: 'defaults', axes: [] };
  const axes = coverage.axes ?? [];
  const defaults = Object.fromEntries(
    Object.entries(manifest.settings?.axes ?? {}).map(([axisId, axis]) => [
      axisId,
      axis.default,
    ]),
  );

  if (!includeAllVariants || coverage.mode !== 'cartesian') {
    return [defaults];
  }

  return axes.reduce(
    (variants, axisId) =>
      variants.flatMap((variant) =>
        (manifest.settings.axes[axisId]?.values ?? []).map((value) => ({
          ...variant,
          [axisId]: value,
        })),
      ),
    [defaults],
  );
}

function indexById(values, label, addError) {
  const index = new Map();
  if (!Array.isArray(values)) {
    addError(`${label} must be an array.`);
    return index;
  }

  for (const value of values) {
    const id = value?.id;
    if (!id || typeof id !== 'string') {
      addError(`${label} contains an item without a string id.`);
      continue;
    }
    if (index.has(id)) {
      addError(`${label} contains duplicate id ${id}.`);
      continue;
    }
    index.set(id, value);
  }
  return index;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isRect(value) {
  return (
    value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function createEmptyInventory() {
  return {
    pages: [],
    devUi: [],
    globalOwners: [],
    domSelectors: [],
    tutorialSteps: [],
    settingOptions: {},
  };
}

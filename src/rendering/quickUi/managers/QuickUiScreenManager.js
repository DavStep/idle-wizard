import { Container } from 'pixi.js';
import quickUiAtlasData from '../../../../assets/quick-ui/atlas/atlas.json';
import quickUiAtlasImageUrl from '../../../../assets/quick-ui/atlas/atlas.png';

const QUICK_UI_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const QUICK_UI_EXPORT_DIR = 'assets/quick-ui/exports';
const QUICK_UI_EXPORT_MODULES = import.meta.glob(
  '../../../../assets/quick-ui/exports/*.json',
  {
    eager: true,
    import: 'default',
  },
);
const atlasLoads = new Map();

export function getQuickUiNameFromSearch(search) {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  const requestedName = params.get('quick_ui') ?? params.get('ui');

  return requestedName ? normalizeQuickUiName(requestedName) : null;
}

export function makeQuickUiExportPath(name, baseUrl = '/') {
  return `${normalizeBaseUrl(baseUrl)}${QUICK_UI_EXPORT_DIR}/${normalizeQuickUiName(name)}.json`;
}

export function scopeQuickUiExportAssetAliases(exportData, scope) {
  const scoped = globalThis.structuredClone(exportData);

  for (const asset of scoped.assets ?? []) {
    asset.id = createScopedAssetAlias(scope, asset.id);
  }

  rewriteNodeAssetAliases(scoped.children ?? [], scope);
  return scoped;
}

export function resolveQuickUiSourceViewportTransform({
  canvasWidth,
  canvasHeight,
  viewportWidth,
  viewportHeight,
}) {
  if (
    !(canvasWidth > 0) ||
    !(canvasHeight > 0) ||
    !(viewportWidth > 0) ||
    !(viewportHeight > 0)
  ) {
    return { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  }

  const presentationScale = Math.min(
    canvasWidth / viewportWidth,
    canvasHeight / viewportHeight,
  );
  const scaleX = (viewportWidth * presentationScale) / canvasWidth;
  const scaleY = (viewportHeight * presentationScale) / canvasHeight;

  return {
    x: (viewportWidth - viewportWidth * scaleX) / 2,
    y: (viewportHeight - viewportHeight * scaleY) / 2,
    scaleX,
    scaleY,
  };
}

export class QuickUiScreenManager {
  constructor({
    whenPixiReady = async () => null,
    getCanvas = () => null,
    viewport,
    runtimeLoader = loadRuntime,
    baseUrl = import.meta.env.BASE_URL,
    exports = QUICK_UI_EXPORT_MODULES,
    atlasData = quickUiAtlasData,
    atlasImageUrl = quickUiAtlasImageUrl,
    resizeObserverFactory = createResizeObserver,
    presentationContainerFactory = createPresentationContainer,
  } = {}) {
    this.whenPixiReady = whenPixiReady;
    this.getCanvas = getCanvas;
    this.viewport = viewport;
    this.runtimeLoader = runtimeLoader;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.exports = indexQuickUiExports(exports);
    this.atlasData = atlasData;
    this.atlasImageUrl = atlasImageUrl;
    this.resizeObserverFactory = resizeObserverFactory;
    this.presentationContainerFactory = presentationContainerFactory;
    this.activePreview = null;
    this.screenPresentations = new Map();
    this.canvasPresentation = null;
  }

  async createScreen(name, options = {}) {
    const resolved = await this.fetchExport(name);
    const [{ UIFactory }, { Assets, Spritesheet }] = await this.runtimeLoader();
    const exportData = scopeQuickUiExportAssetAliases(
      resolved.data,
      resolved.name,
    );

    await cacheQuickUiExportTextures({
      Assets,
      Spritesheet,
      exportData,
      atlasData: this.atlasData,
      atlasImageUrl: this.atlasImageUrl,
      label: `${resolved.name} qUIck`,
    });

    const factory = new UIFactory({
      assetBasePath: `${this.baseUrl}${QUICK_UI_EXPORT_DIR}`,
      debug: options.debug,
      debugDrawBounds: options.debugDrawBounds,
      debugShowNames: options.debugShowNames,
    });
    const screen = await factory.createScreen(exportData);
    screen.resize(
      options.viewportWidth ?? this.viewport.width,
      options.viewportHeight ?? this.viewport.height,
      options.safeArea,
    );

    return {
      name: resolved.name,
      jsonPath: resolved.path,
      exportData,
      screen,
    };
  }

  async mountPreview(name, options = {}) {
    const layers = await this.whenPixiReady();

    if (!layers) {
      throw new Error('qUIck preview requires an initialized Pixi surface.');
    }

    const result = await this.createScreen(name, options);
    this.dismissPreview();

    const targetLayer = layers.overlay ?? layers.ui ?? layers.root;

    if (!targetLayer) {
      result.screen.destroy({ children: true });
      throw new Error('qUIck preview could not find a Pixi UI layer.');
    }

    result.screen.label = `quick-ui-preview:${result.name}`;
    result.screen.getButton('btn_close')?.onClick(() => {
      this.dismissPreview();
    });
    this.mountScreen(result.screen, targetLayer);
    this.activePreview = result.screen;
    this.activateCanvasPreview();

    window.__quickUi = result.screen;
    window.__quickUiExport = result.exportData;
    globalThis.console.info(
      `[qUIck] Mounted ${result.jsonPath}. Use window.__quickUi to inspect or bind nodes.`,
    );

    return result;
  }

  async fetchExport(name) {
    const normalizedName = normalizeQuickUiName(name);
    const path = makeQuickUiExportPath(normalizedName, this.baseUrl);
    const data = this.exports.get(normalizedName);

    if (!data) {
      throw new Error(
        `Could not load qUIck export "${normalizedName}" from ${path}. `
        + 'Run npm run import:quick-ui to add it to assets/quick-ui/exports.',
      );
    }

    return {
      name: normalizedName,
      path,
      data,
    };
  }

  dismissPreview() {
    if (!this.activePreview) {
      return;
    }

    const preview = this.activePreview;
    this.activePreview = null;
    this.unmountScreen(preview);
    this.restoreCanvasPresentation();

    if (window.__quickUi === preview) {
      delete window.__quickUi;
      delete window.__quickUiExport;
    }
  }

  unmount() {
    this.dismissPreview();

    for (const screen of this.screenPresentations.keys()) {
      this.unmountScreen(screen);
    }
  }

  activateCanvasPreview() {
    const canvas = this.getCanvas();

    if (!canvas || this.canvasPresentation) {
      return;
    }

    this.canvasPresentation = {
      canvas,
      pointerEvents: canvas.style.pointerEvents,
      zIndex: canvas.style.zIndex,
    };
    canvas.style.pointerEvents = 'auto';
    canvas.style.zIndex = '129';
  }

  restoreCanvasPresentation() {
    if (!this.canvasPresentation) {
      return;
    }

    const { canvas, pointerEvents, zIndex } = this.canvasPresentation;
    canvas.style.pointerEvents = pointerEvents;
    canvas.style.zIndex = zIndex;
    this.canvasPresentation = null;
  }

  mountScreen(screen, targetLayer) {
    if (!screen || !targetLayer) {
      throw new Error('qUIck screen mounting requires a screen and Pixi layer.');
    }

    const wrapper = this.presentationContainerFactory();
    wrapper.label = `quick-ui-source-viewport:${screen.label || 'screen'}`;
    wrapper.addChild(screen);
    targetLayer.addChild(wrapper);
    this.screenPresentations.set(screen, { observer: null, wrapper });
    this.watchScreenPresentation(screen);
    return screen;
  }

  unmountScreen(screen, { destroy = true } = {}) {
    const presentation = this.screenPresentations.get(screen);

    if (!presentation) {
      return;
    }

    presentation.observer?.disconnect();
    this.screenPresentations.delete(screen);
    presentation.wrapper.parent?.removeChild(presentation.wrapper);

    if (destroy) {
      presentation.wrapper.destroy({ children: true });
      return;
    }

    presentation.wrapper.removeChild(screen);
    presentation.wrapper.destroy({ children: false });
  }

  watchScreenPresentation(screen) {
    const canvas = this.getCanvas();
    const presentation = this.screenPresentations.get(screen);

    if (!canvas || !presentation) {
      return;
    }

    const updatePresentation = () => {
      this.fitScreenToSourceViewport(screen, canvas);
    };

    updatePresentation();
    presentation.observer?.disconnect();
    const observer = this.resizeObserverFactory(updatePresentation) ?? null;

    if (observer) {
      presentation.observer = observer;
      observer.observe(canvas);
    }
  }

  fitScreenToSourceViewport(screen, canvas = this.getCanvas()) {
    const presentation = this.screenPresentations.get(screen);
    const displayObject = presentation?.wrapper ?? screen;

    if (!canvas || !displayObject) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const transform = resolveQuickUiSourceViewportTransform({
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      viewportWidth: this.viewport.width,
      viewportHeight: this.viewport.height,
    });

    displayObject.position.set(transform.x, transform.y);
    displayObject.scale.set(transform.scaleX, transform.scaleY);
  }
}

function createPresentationContainer() {
  return new Container();
}

function createResizeObserver(callback) {
  return typeof globalThis.ResizeObserver === 'function'
    ? new globalThis.ResizeObserver(callback)
    : null;
}

async function loadRuntime() {
  return Promise.all([
    import('@figma-pixi/pixi-runtime'),
    import('pixi.js'),
  ]);
}

async function cacheQuickUiExportTextures({
  Assets,
  Spritesheet,
  exportData,
  atlasData,
  atlasImageUrl,
  label,
}) {
  let atlasLoad = atlasLoads.get(atlasImageUrl);

  if (!atlasLoad) {
    atlasLoad = Assets.load(atlasImageUrl).then(async (texture) => {
      const sheet = new Spritesheet(texture, atlasData);
      await sheet.parse();
      return sheet;
    });
    atlasLoads.set(atlasImageUrl, atlasLoad);
  }

  const sheet = await atlasLoad;

  for (const asset of exportData.assets ?? []) {
    if (!isTextureAsset(asset)) {
      continue;
    }

    const frameName = toQuickUiAtlasFrameName(asset.src);
    const texture = sheet.textures?.[frameName];

    if (!texture) {
      throw new Error(
        `${label} asset "${asset.id}" is missing from atlas frame "${frameName}". Run npm run assets:quick-ui.`,
      );
    }

    Assets.cache.set(asset.id, texture);
  }
}

function indexQuickUiExports(modules) {
  const exports = new Map();

  for (const [modulePath, exportData] of Object.entries(modules ?? {})) {
    const fileName = modulePath.split('/').pop() ?? '';
    const name = fileName.replace(/\.json$/i, '');

    if (name) {
      exports.set(name, exportData);
    }
  }

  return exports;
}

function normalizeQuickUiName(name) {
  const normalized = String(name).trim().replace(/\.json$/i, '');

  if (!QUICK_UI_NAME_PATTERN.test(normalized)) {
    throw new Error(
      `qUIck export name "${name}" must use only letters, numbers, underscores, or dashes.`,
    );
  }

  return normalized;
}

function normalizeBaseUrl(baseUrl) {
  const normalized = String(baseUrl || '/').trim() || '/';
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function createScopedAssetAlias(scope, assetId) {
  return `${scope}:${assetId}`;
}

function rewriteNodeAssetAliases(nodes, scope) {
  for (const node of nodes) {
    if (node.assetId) {
      node.assetId = createScopedAssetAlias(scope, node.assetId);
    }

    if (node.children?.length) {
      rewriteNodeAssetAliases(node.children, scope);
    }
  }
}

function isTextureAsset(asset) {
  if (asset.type === 'image' || asset.type === 'atlas') {
    return true;
  }

  return (
    asset.type === undefined &&
    asset.mimeType === 'image/png' &&
    asset.src.toLowerCase().endsWith('.png')
  );
}

function toQuickUiAtlasFrameName(assetPath) {
  const normalized = String(assetPath).trim().replace(/\\/g, '/');
  const generatedUiMarker = 'generated-ui/';
  const generatedUiIndex = normalized.indexOf(generatedUiMarker);

  if (generatedUiIndex >= 0) {
    return normalized.slice(generatedUiIndex + generatedUiMarker.length);
  }

  return normalized.replace(/^\/+/, '');
}

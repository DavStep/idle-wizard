import {
  Application,
  Assets,
  Container,
  Texture,
} from 'pixi.js';

import {
  PIXI_PRODUCTION_ASSET_MANIFEST,
} from '../../rendering/pixi/assets/PixiProductionAssetManifest.js';
import {
  createUiEditorThumbnailRenderQueue,
} from './UiEditorThumbnailRenderQueue.js';

const THUMBNAIL_RENDER_HEIGHT = 54;
const THUMBNAIL_RENDER_WIDTH = 212;
const assetManagers = new Map();
const thumbnailRenderQueue = createUiEditorThumbnailRenderQueue();
let sharedRendererPromise = null;

/**
 * Creates a lazy, passive library thumbnail from one production Pixi control.
 */
export function createUiEditorPixiThumbnail({
  assetFilter = () => false,
  component = 'PixiIntegration',
  createControl,
  id = component,
} = {}) {
  if (typeof createControl !== 'function') {
    throw new Error('Pixi UI Lab thumbnails require createControl.');
  }

  const host = document.createElement('span');
  const canvas = document.createElement('canvas');
  const status = document.createElement('span');
  let observer = null;
  let renderGeneration = 0;

  host.className = 'ui-editor-game-widget-thumbnail';
  host.dataset.editorLibraryThumbnail = id;
  canvas.className = 'ui-editor-game-widget-thumbnail__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  status.className = 'ui-editor-game-widget-thumbnail__status';
  status.setAttribute('aria-hidden', 'true');
  status.textContent = 'Loading…';
  host.append(canvas, status);

  const suspend = () => {
    renderGeneration += 1;
  };

  const render = async () => {
    if (host.dataset.ready === 'true' || host.dataset.loading === 'true') {
      return;
    }

    const generation = ++renderGeneration;
    host.dataset.loading = 'true';
    delete host.dataset.error;
    status.textContent = 'Loading…';

    try {
      const rendered = await thumbnailRenderQueue.run(async () => {
        if (generation !== renderGeneration || !host.isConnected) {
          return false;
        }
        return renderThumbnail({
          assetFilter,
          canvas,
          component,
          createControl,
          host,
        });
      });

      if (!rendered || generation !== renderGeneration || !host.isConnected) {
        return;
      }
      host.dataset.ready = 'true';
      status.textContent = '';
    } catch (error) {
      if (generation === renderGeneration) {
        host.dataset.error = 'true';
        status.textContent = 'Preview unavailable';
        globalThis.console?.error(error);
      }
    } finally {
      host.dataset.loading = 'false';
    }
  };

  host.uiEditorThumbnailConnect = () => {
    if (observer) {
      return;
    }
    if (typeof globalThis.IntersectionObserver !== 'function') {
      void render();
      return;
    }
    observer = new globalThis.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void render();
        } else {
          suspend();
        }
      },
      { rootMargin: '80px 0px' },
    );
    observer.observe(host);
  };

  host.uiEditorThumbnailDisconnect = () => {
    observer?.disconnect();
    observer = null;
    suspend();
  };

  return host;
}

async function renderThumbnail({
  assetFilter,
  canvas,
  component,
  createControl,
  host,
}) {
  const [{ application, canvas: renderCanvas }, assets] = await Promise.all([
    getSharedRenderer(),
    getAssetManager(component, assetFilter).load(),
  ]);
  let control = null;

  try {
    if (!host.isConnected) {
      return false;
    }

    control = await createControl({ assets, input: null });
    const root = resolveDisplayObject(control);
    if (!(root instanceof Container)) {
      throw new Error(`${component} thumbnail did not return a Pixi Container.`);
    }
    layoutControl(root, control);
    root.eventMode = 'none';
    application.stage.addChild(root);
    application.renderer.render(application.stage);

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('The UI editor thumbnail canvas is unavailable.');
    }
    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(renderCanvas, 0, 0);
    canvas.dataset.editorRenderer = 'static';
    return true;
  } finally {
    application.stage.removeChildren();
    destroyControl(control);
  }
}

function getSharedRenderer() {
  sharedRendererPromise ??= createSharedRenderer();
  return sharedRendererPromise;
}

async function createSharedRenderer() {
  const canvas = document.createElement('canvas');
  const application = new Application();
  await application.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    canvas,
    height: THUMBNAIL_RENDER_HEIGHT,
    preserveDrawingBuffer: true,
    resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
    width: THUMBNAIL_RENDER_WIDTH,
  });
  return { application, canvas };
}

function getAssetManager(component, assetFilter) {
  if (!assetManagers.has(component)) {
    assetManagers.set(
      component,
      new UiEditorThumbnailAssetManager(
        PIXI_PRODUCTION_ASSET_MANIFEST.filter(assetFilter),
      ),
    );
  }
  return assetManagers.get(component);
}

function resolveDisplayObject(control) {
  return control?.root ?? control?.displayObject ?? control;
}

function layoutControl(root, control) {
  const inset = 8;
  const bounds = root.getLocalBounds();
  const width = Number(control?.width) || bounds.width;
  const height = Number(control?.height) || bounds.height;
  const availableWidth = THUMBNAIL_RENDER_WIDTH - inset * 2;
  const availableHeight = THUMBNAIL_RENDER_HEIGHT - inset * 2;
  const scale = Math.min(
    1.15,
    availableWidth / Math.max(1, width),
    availableHeight / Math.max(1, height),
  );
  root.scale.set(scale);
  root.position.set(
    (THUMBNAIL_RENDER_WIDTH - width * scale) / 2 - bounds.x * scale,
    (THUMBNAIL_RENDER_HEIGHT - height * scale) / 2 - bounds.y * scale,
  );
}

function destroyControl(control) {
  const root = resolveDisplayObject(control);
  control?.destroy?.();
  if (!control?.destroy && root && !root.destroyed) {
    root.destroy({ children: true });
  }
}

class UiEditorThumbnailAssetManager {
  constructor(manifest) {
    this.manifest = manifest;
    this.loadPromise = null;
    this.textures = new Map();
  }

  load() {
    this.loadPromise ??= Promise.all(
      this.manifest.map(async ({ id, src }) => {
        this.textures.set(id, await Assets.load(src));
      }),
    ).then(() => this);
    return this.loadPromise;
  }

  has(assetId) {
    return this.textures.has(assetId);
  }

  getTexture(assetId) {
    return this.textures.get(assetId) ?? Texture.EMPTY;
  }

  getAtlasTexture() {
    return Texture.EMPTY;
  }
}

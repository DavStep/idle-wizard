import { gameViewport } from '../../viewport/gameViewport.js';

function readRootRunUiRendererEnabled() {
  return import.meta.env?.VITE_DISABLE_ROOT_RUN_UI_RENDERER !== 'true';
}

function defaultUiRendererSupported() {
  return !String(globalThis.navigator?.userAgent || '')
    .toLowerCase()
    .includes('jsdom');
}

function defaultSpineRuntimeImporter() {
  return import('@esotericsoftware/spine-pixi-v8');
}

function defaultPixiImporter() {
  return import('pixi.js');
}

export function resolveCanvasPresentation({
  designWidth,
  designHeight,
  availableWidth,
  availableHeight,
  devicePixelRatio,
}) {
  const validDesignWidth = designWidth > 0 ? designWidth : 1;
  const validDesignHeight = designHeight > 0 ? designHeight : 1;
  const validAvailableWidth =
    availableWidth > 0 ? availableWidth : validDesignWidth;
  const validAvailableHeight =
    availableHeight > 0 ? availableHeight : validDesignHeight;
  const validDevicePixelRatio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const containScale = Math.min(
    validAvailableWidth / validDesignWidth,
    validAvailableHeight / validDesignHeight,
  );

  return {
    cssWidth: Math.floor(validDesignWidth * containScale),
    cssHeight: Math.floor(validDesignHeight * containScale),
    renderResolution: validDevicePixelRatio * containScale,
  };
}

function createResizeObserver(callback) {
  if (typeof ResizeObserver !== 'function') {
    return null;
  }

  return new ResizeObserver(callback);
}

export class CanvasManager {
  constructor({
    viewport = gameViewport,
    uiRendererEnabled = readRootRunUiRendererEnabled(),
    isUiRendererSupported = defaultUiRendererSupported,
    resizeObserverFactory = createResizeObserver,
    getDevicePixelRatio = () => globalThis.devicePixelRatio || 1,
    importSpineRuntime = defaultSpineRuntimeImporter,
    importPixi = defaultPixiImporter,
  } = {}) {
    this.viewport = viewport;
    this.uiRendererEnabled = uiRendererEnabled;
    this.isUiRendererSupported = isUiRendererSupported;
    this.resizeObserverFactory = resizeObserverFactory;
    this.getDevicePixelRatio = getDevicePixelRatio;
    this.importSpineRuntime = importSpineRuntime;
    this.importPixi = importPixi;
    this.canvas = null;
    this.stage = null;
    this.app = null;
    this.pixi = null;
    this.layers = null;
    this.uiRendererManager = null;
    this.initPromise = null;
    this.resizeObserver = null;
    this.presentation = null;
    this.destroyed = false;
    this.lifecycleGeneration = 0;
    this.handlePresentationResize = () => {
      this.updateCanvasPresentation();
    };
  }

  mount(stage) {
    if (!stage) {
      throw new Error('CanvasManager requires a stage element.');
    }

    if (this.canvas) {
      return this.canvas;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas game-pixi-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.width = this.viewport.width;
    this.canvas.height = this.viewport.height;
    stage.append(this.canvas);
    this.stage = stage;
    this.destroyed = false;
    this.lifecycleGeneration += 1;
    this.updateCanvasPresentation();
    this.watchPresentationSize();

    if (this.shouldStartUiRenderer()) {
      stage.dataset.rootRunUiRenderer = 'initializing';
      void this.ensureApp();
    }

    return this.canvas;
  }

  unmount() {
    this.destroyed = true;
    this.lifecycleGeneration += 1;
    this.unwatchPresentationSize();
    this.uiRendererManager?.unmount();
    this.uiRendererManager = null;
    this.app?.destroy({ removeView: false }, { children: true });
    this.app = null;
    this.pixi = null;
    this.layers = null;
    this.initPromise = null;
    this.canvas?.remove();
    this.canvas = null;
    this.stage?.removeAttribute('data-root-run-ui-renderer');
    this.stage = null;
    this.presentation = null;
  }

  getCanvas() {
    return this.canvas;
  }

  getPixiApp() {
    return this.app;
  }

  getPixiLayers() {
    return this.layers;
  }

  attachUiDisplayObject(element, object, options) {
    return (
      this.uiRendererManager?.attachExternalDisplayObject?.(
        element,
        object,
        options,
      ) ?? false
    );
  }

  detachUiDisplayObject(element, object) {
    this.uiRendererManager?.detachExternalDisplayObject?.(element, object);
  }

  async whenReady() {
    await this.ensureApp();
    return this.layers;
  }

  async ensureApp() {
    if (!this.canvas) {
      return null;
    }

    if (this.app) {
      return this.app;
    }

    if (!this.initPromise) {
      const generation = this.lifecycleGeneration;
      const initPromise = this.initApp(generation)
        .catch((error) => {
          if (generation === this.lifecycleGeneration) {
            this.failOpenUiRenderer(error);
          }
          return null;
        })
        .finally(() => {
          if (this.initPromise === initPromise) {
            this.initPromise = null;
          }
        });
      this.initPromise = initPromise;
    }

    return this.initPromise;
  }

  async initApp(generation = this.lifecycleGeneration) {
    const canvas = this.canvas;
    const stage = this.stage;

    if (!this.isLifecycleCurrent(generation, canvas, stage)) {
      return null;
    }

    // Pixi snapshots registered render pipes during Application.init().
    // Register Spine first so a tutorial skeleton can be added to this shared
    // application later without leaving renderPipes.spine undefined.
    await this.importSpineRuntime();
    const { Application, Container } = await this.importPixi();

    if (!this.isLifecycleCurrent(generation, canvas, stage)) {
      return null;
    }

    const presentation = this.resolvePresentation();
    const app = new Application();
    await app.init({
      canvas,
      width: this.viewport.width,
      height: this.viewport.height,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: presentation.renderResolution,
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    this.presentation = presentation;
    this.syncCanvasCssSize(presentation);

    if (!this.isLifecycleCurrent(generation, canvas, stage)) {
      app.destroy({ removeView: false }, { children: true });
      return null;
    }

    this.pixi = { Application, Container };
    this.app = app;
    this.updateCanvasPresentation();
    this.layers = this.createLayers({ Container });
    app.stage.addChild(this.layers.root);

    if (this.shouldStartUiRenderer()) {
      await this.startUiRenderer(generation);
    }

    if (!this.isLifecycleCurrent(generation, canvas, stage)) {
      return null;
    }

    return app;
  }

  async startUiRenderer(generation = this.lifecycleGeneration) {
    const stage = this.stage;
    const canvas = this.canvas;
    const layers = this.layers;

    if (!this.isLifecycleCurrent(generation, canvas, stage) || !layers) {
      return;
    }

    const { RootRunUiRendererManager } = await import(
      '../pixi/RootRunUiRendererManager.js'
    );

    if (
      !this.isLifecycleCurrent(generation, canvas, stage) ||
      this.layers !== layers
    ) {
      return;
    }

    this.uiRendererManager?.unmount();
    this.uiRendererManager = new RootRunUiRendererManager({
      stage,
      canvas,
      layers,
    });
    await this.uiRendererManager.mount();
  }

  isLifecycleCurrent(generation, canvas, stage) {
    return Boolean(
      !this.destroyed &&
        generation === this.lifecycleGeneration &&
        canvas &&
        canvas === this.canvas &&
        stage &&
        stage === this.stage,
    );
  }

  shouldStartUiRenderer() {
    return Boolean(this.uiRendererEnabled && this.isUiRendererSupported());
  }

  failOpenUiRenderer(error) {
    this.uiRendererManager?.failOpen?.();
    if (this.stage && this.uiRendererEnabled) {
      this.stage.dataset.rootRunUiRenderer = 'fallback';
    }
    globalThis.console?.warn?.(
      '[rendering] Root Run UI renderer could not initialize; using DOM UI.',
      error,
    );
  }

  watchPresentationSize() {
    this.resizeObserver = this.resizeObserverFactory?.(
      this.handlePresentationResize,
    );
    this.resizeObserver?.observe(this.stage);
    globalThis.window?.addEventListener(
      'resize',
      this.handlePresentationResize,
    );
    globalThis.window?.addEventListener(
      'orientationchange',
      this.handlePresentationResize,
    );
  }

  unwatchPresentationSize() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    globalThis.window?.removeEventListener(
      'resize',
      this.handlePresentationResize,
    );
    globalThis.window?.removeEventListener(
      'orientationchange',
      this.handlePresentationResize,
    );
  }

  updateCanvasPresentation() {
    if (!this.canvas || !this.stage) {
      return;
    }

    const presentation = this.resolvePresentation();
    const renderer = this.app?.renderer;

    if (
      renderer &&
      renderer.resolution !== presentation.renderResolution
    ) {
      renderer.resize(
        this.viewport.width,
        this.viewport.height,
        presentation.renderResolution,
      );
    }

    this.presentation = presentation;
    // Pixi autoDensity writes its own logical CSS dimensions during init and
    // renderer.resize(). Reassert the contain-fitted presentation afterwards.
    this.syncCanvasCssSize(presentation);
  }

  resolvePresentation() {
    const stageRect = this.stage?.getBoundingClientRect?.();

    return resolveCanvasPresentation({
      designWidth: this.viewport.width,
      designHeight: this.viewport.height,
      availableWidth:
        stageRect?.width || this.stage?.clientWidth || this.viewport.width,
      availableHeight:
        stageRect?.height || this.stage?.clientHeight || this.viewport.height,
      devicePixelRatio: this.getDevicePixelRatio(),
    });
  }

  syncCanvasCssSize(presentation = this.resolvePresentation()) {
    if (!this.canvas) {
      return;
    }

    this.canvas.style.inset = 'auto';
    this.canvas.style.left = '50%';
    this.canvas.style.top = '50%';
    this.canvas.style.width = `${presentation.cssWidth}px`;
    this.canvas.style.height = `${presentation.cssHeight}px`;
    this.canvas.style.transform = 'translate(-50%, -50%)';
  }

  createLayers({ Container }) {
    const sourceScale = this.viewport.sourceScale ?? 3;
    const root = new Container();
    root.label = 'gameRoot';
    root.eventMode = 'passive';

    const background = new Container();
    background.label = 'backgroundLayer';
    background.eventMode = 'none';

    const ui = new Container();
    ui.label = 'uiLayer';
    ui.scale.set(sourceScale);
    ui.eventMode = 'passive';

    const popup = new Container();
    popup.label = 'popupLayer';
    popup.scale.set(sourceScale);
    popup.eventMode = 'passive';

    const overlay = new Container();
    overlay.label = 'overlayLayer';
    overlay.scale.set(sourceScale);
    overlay.eventMode = 'passive';

    root.addChild(background, ui, popup, overlay);

    return {
      root,
      background,
      ui,
      popup,
      overlay,
      viewport: this.viewport,
      sourceScale,
      sourceWidth: this.viewport.width / sourceScale,
      sourceHeight: this.viewport.height / sourceScale,
    };
  }
}

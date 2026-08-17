import { Capacitor } from '@capacitor/core';
import {
  Application,
  Container,
  Graphics,
  Rectangle,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { ViewportProjectionManager } from './ViewportProjectionManager.js';

const PIXI_AUTHORED_VIEWPORT = Object.freeze({
  width: PIXI_UI_GEOMETRY.authoredWidth,
  height: PIXI_UI_GEOMETRY.authoredHeight,
});

const TEXT_ENTRY_PROJECTION_RELEASE_DELAY_MS = 500;
const ANDROID_MAX_RENDER_FPS = 60;

function defaultSpineRuntimeImporter() {
  return import('@esotericsoftware/spine-pixi-v8');
}

const SOURCE_LAYER_NAMES = Object.freeze([
  'globalChrome',
  'tooltips',
  'tutorial',
  'transient',
  'interactionLocks',
]);

export class PixiApplicationManager {
  static explain =
    'Owns the one production Pixi application, native-pixel renderer sizing, and stable layer order.';

  constructor({
    canvas,
    viewport = PIXI_AUTHORED_VIEWPORT,
    projectionManager = new ViewportProjectionManager({ viewport }),
    createApplication = () => new Application(),
    prepareSpineRuntime = defaultSpineRuntimeImporter,
    windowTarget = globalThis.window ?? null,
    devicePixelRatio = () => globalThis.devicePixelRatio || 1,
    isNativePlatform = () => Capacitor.isNativePlatform(),
    getPlatform = () => Capacitor.getPlatform(),
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = (timer) => globalThis.clearTimeout(timer),
  } = {}) {
    if (!canvas) {
      throw new Error('PixiApplicationManager requires the production canvas.');
    }
    this.canvas = canvas;
    this.viewport = viewport;
    this.projectionManager = projectionManager;
    this.createApplication = createApplication;
    this.prepareSpineRuntime = prepareSpineRuntime;
    this.windowTarget = windowTarget;
    this.devicePixelRatio = devicePixelRatio;
    this.isNativePlatform = isNativePlatform;
    this.getPlatform = getPlatform;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.app = null;
    this.layers = null;
    this.projection = null;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.initializePromise = null;
    this.resizeFrame = null;
    this.textEntryProjectionReleaseTimer = null;
    this.listeners = new Set();
    this.keyboardInset = 0;
    this.visibleHeight = null;
    this.textEntryActive = false;
    this.splashViewportActive = false;
    this.destroyed = false;
    this.handleResize = () => this.scheduleResize();
    this.handleContextLost = (event) => event.preventDefault?.();
    this.handleContextRestored = () => {
      this.applyProjection(this.measureProjection());
      for (const listener of this.listeners) {
        listener(this.projection, { contextRestored: true });
      }
    };
  }

  initialize() {
    if (this.initializePromise) {
      return this.initializePromise;
    }
    this.initializePromise = this.performInitialize();
    return this.initializePromise;
  }

  async performInitialize() {
    if (this.destroyed) {
      throw new Error('Cannot initialize a destroyed Pixi application manager.');
    }
    const projection = this.measureProjection();
    await this.prepareSpineRuntime();
    if (this.destroyed) {
      return null;
    }
    const app = this.createApplication();
    const resolution = this.getNativeResolution(projection.fitScale);
    await app.init({
      canvas: this.canvas,
      width: projection.stageLogicalWidth,
      height: projection.stageLogicalHeight,
      resolution,
      autoDensity: false,
      antialias: true,
      backgroundAlpha: 0,
      preference: 'webgl',
      powerPreference: 'high-performance',
      hello: false,
    });
    this.applyRenderFrameRate(app);

    if (this.destroyed) {
      app.destroy({ removeView: false }, { children: true });
      return null;
    }

    this.app = app;
    this.layers = this.createLayers();
    this.app.stage.label = 'idleWizardRoot';
    this.app.stage.eventMode = 'static';
    this.app.stage.addChild(this.layers.root);
    this.installListeners();
    this.applyProjection(projection);
    this.applyTheme(this.theme);
    return this;
  }

  applyRenderFrameRate(app) {
    if (!app?.ticker) {
      return 0;
    }

    let maxFps = 0;
    try {
      if (this.isNativePlatform() && this.getPlatform() === 'android') {
        maxFps = ANDROID_MAX_RENDER_FPS;
      }
    } catch {
      // Platform detection must never prevent the renderer from starting.
    }

    app.ticker.maxFPS = maxFps;
    return maxFps;
  }

  createLayers() {
    const root = new Container();
    root.label = 'stableLayers';
    root.eventMode = 'passive';

    const background = new Container();
    background.label = 'backgroundLayer';
    background.eventMode = 'none';
    const backgroundGraphic = new Graphics();
    backgroundGraphic.label = 'stageBackground';
    background.addChild(backgroundGraphic);

    const pageWorlds = new Container();
    pageWorlds.label = 'pageWorldsLayer';
    pageWorlds.eventMode = 'passive';

    const pageUi = new Container();
    pageUi.label = 'pageUiLayer';
    pageUi.eventMode = 'passive';

    const dialogs = new Container();
    dialogs.label = 'dialogsLayer';
    dialogs.eventMode = 'passive';
    const dialogsSource = new Container();
    dialogsSource.label = 'dialogsSourceLayer';
    dialogsSource.eventMode = 'passive';
    dialogs.addChild(dialogsSource);

    const sourceLayers = Object.fromEntries(
      SOURCE_LAYER_NAMES.map((name) => {
        const layer = new Container();
        layer.label = `${name}Layer`;
        layer.eventMode = name === 'interactionLocks' ? 'static' : 'passive';
        return [name, layer];
      }),
    );
    sourceLayers.interactionLocks.sortableChildren = true;

    root.addChild(
      background,
      pageWorlds,
      pageUi,
      sourceLayers.globalChrome,
      dialogs,
      sourceLayers.tooltips,
      sourceLayers.tutorial,
      sourceLayers.transient,
      sourceLayers.interactionLocks,
    );

    return {
      root,
      background,
      backgroundGraphic,
      pageWorlds,
      pageUi,
      dialogs,
      dialogsSource,
      ...sourceLayers,
    };
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    if (!this.layers) {
      return;
    }
    this.layers.backgroundGraphic
      .clear()
      .rect(
        0,
        0,
        this.projection.stageLogicalWidth,
        this.projection.stageLogicalHeight,
      )
      .fill(this.theme.background)
      .rect(
        this.projection.authoredOffsetX,
        0,
        this.viewport.width,
        this.projection.stageLogicalHeight,
      )
      .fill(this.theme.surface);
  }

  setKeyboardMetrics({ keyboardInset = 0, visibleHeight = null } = {}) {
    const previousKeyboardInset = this.keyboardInset;
    this.keyboardInset = Math.max(0, Number(keyboardInset) || 0);
    this.visibleHeight = Number.isFinite(visibleHeight) ? visibleHeight : null;
    if (this.keyboardInset > 0) {
      this.cancelTextEntryProjectionRelease();
      this.projectionManager.lockTextEntry();
    } else if (!this.textEntryActive) {
      this.projectionManager.unlockTextEntry();
      if (
        previousKeyboardInset > 0 ||
        this.textEntryProjectionReleaseTimer !== null
      ) {
        this.scheduleTextEntryProjectionRelease();
      }
    }
    return this.resizeNow();
  }

  setTextEntryActive(active) {
    const wasTextEntryActive = this.textEntryActive;
    this.textEntryActive = active === true;
    if (this.textEntryActive) {
      this.cancelTextEntryProjectionRelease();
      this.projectionManager.lockTextEntry();
    } else {
      this.projectionManager.unlockTextEntry();
      if (
        wasTextEntryActive ||
        this.keyboardInset > 0 ||
        this.textEntryProjectionReleaseTimer !== null
      ) {
        this.scheduleTextEntryProjectionRelease();
      }
    }
    return this.resizeNow();
  }

  scheduleTextEntryProjectionRelease() {
    this.cancelTextEntryProjectionRelease();
    this.textEntryProjectionReleaseTimer = this.setTimer(() => {
      this.textEntryProjectionReleaseTimer = null;
      if (this.destroyed || this.textEntryActive || this.keyboardInset > 0) {
        return;
      }
      this.projectionManager.unlockTextEntry({ force: true });
      this.resizeNow();
    }, TEXT_ENTRY_PROJECTION_RELEASE_DELAY_MS);
  }

  cancelTextEntryProjectionRelease() {
    if (this.textEntryProjectionReleaseTimer === null) {
      return;
    }
    this.clearTimer(this.textEntryProjectionReleaseTimer);
    this.textEntryProjectionReleaseTimer = null;
  }

  setSplashViewportActive(active) {
    const nextActive = active === true;
    if (this.splashViewportActive === nextActive) {
      return this.projection;
    }
    this.splashViewportActive = nextActive;
    this.canvas.classList?.toggle('is-splash-viewport', nextActive);
    return this.resizeNow();
  }

  resizeNow() {
    if (!this.app) {
      return null;
    }
    const projection = this.measureProjection();
    this.app.renderer.resize(
      projection.stageLogicalWidth,
      projection.stageLogicalHeight,
      this.getNativeResolution(projection.fitScale),
    );
    this.applyProjection(projection);
    for (const listener of this.listeners) {
      listener(projection, { contextRestored: false });
    }
    return projection;
  }

  scheduleResize() {
    if (this.resizeFrame !== null || !this.app) {
      return;
    }
    const requestFrame =
      this.windowTarget?.requestAnimationFrame?.bind(this.windowTarget) ??
      ((callback) => globalThis.setTimeout(callback, 0));
    this.resizeFrame = requestFrame(() => {
      this.resizeFrame = null;
      this.resizeNow();
    });
  }

  measureProjection() {
    const width = Math.max(
      1,
      Math.round(this.canvas.clientWidth || this.windowTarget?.innerWidth || 1),
    );
    const height = Math.max(
      1,
      Math.round(this.canvas.clientHeight || this.windowTarget?.innerHeight || 1),
    );
    return this.projectionManager.project({
      width,
      height,
      visibleHeight: this.resolveVisibleViewportHeight(height),
      keyboardInset: this.keyboardInset,
    });
  }

  resolveVisibleViewportHeight(canvasHeight) {
    if (Number.isFinite(this.visibleHeight)) {
      return Math.max(0, Math.min(canvasHeight, this.visibleHeight));
    }

    const visualViewport = this.windowTarget?.visualViewport;
    const visualHeight = Number(visualViewport?.height);
    if (!(visualHeight > 0)) {
      return Math.max(0, canvasHeight - this.keyboardInset);
    }

    const canvasRect = this.canvas.getBoundingClientRect?.();
    if (canvasRect && Number(canvasRect.height) > 0) {
      const visualTop = Number(visualViewport.offsetTop) || 0;
      const visualBottom = visualTop + visualHeight;
      const canvasTop = Number(canvasRect.top) || 0;
      const canvasBottom = canvasTop + Number(canvasRect.height);
      const intersectionHeight =
        Math.min(canvasBottom, visualBottom) - Math.max(canvasTop, visualTop);

      if (intersectionHeight > 0) {
        return Math.min(canvasHeight, intersectionHeight);
      }
    }

    return Math.min(canvasHeight, visualHeight);
  }

  applyProjection(projection) {
    this.projection = projection;
    if (!this.layers || !this.app) {
      return;
    }
    this.layers.root.hitArea = new Rectangle(
      0,
      0,
      projection.stageLogicalWidth,
      projection.stageLogicalHeight,
    );
    this.app.stage.hitArea = this.layers.root.hitArea;
    this.layers.pageWorlds.position.set(projection.authoredOffsetX, 0);
    this.layers.pageUi.position.set(projection.authoredOffsetX, 0);
    this.layers.pageUi.scale.set(projection.sourceScale);
    this.layers.dialogsSource.position.set(projection.authoredOffsetX, 0);
    this.layers.dialogsSource.scale.set(projection.sourceScale);
    for (const name of SOURCE_LAYER_NAMES) {
      this.layers[name].position.set(projection.authoredOffsetX, 0);
      this.layers[name].scale.set(projection.sourceScale);
    }
    this.applyTheme(this.theme);
  }

  getNativeResolution(fitScale) {
    return Math.max(0.25, fitScale * Math.max(1, Number(this.devicePixelRatio()) || 1));
  }

  subscribeProjection(listener, { emitCurrent = false } = {}) {
    if (typeof listener !== 'function') {
      throw new TypeError('Projection listener must be a function.');
    }
    this.listeners.add(listener);
    if (emitCurrent && this.projection) {
      listener(this.projection, { contextRestored: false });
    }
    return () => this.listeners.delete(listener);
  }

  installListeners() {
    this.windowTarget?.addEventListener?.('resize', this.handleResize);
    this.windowTarget?.visualViewport?.addEventListener?.('resize', this.handleResize);
    this.canvas.addEventListener?.('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener?.('webglcontextrestored', this.handleContextRestored);
  }

  removeListeners() {
    this.windowTarget?.removeEventListener?.('resize', this.handleResize);
    this.windowTarget?.visualViewport?.removeEventListener?.('resize', this.handleResize);
    this.canvas.removeEventListener?.('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener?.('webglcontextrestored', this.handleContextRestored);
    if (this.resizeFrame !== null) {
      this.windowTarget?.cancelAnimationFrame?.(this.resizeFrame);
      globalThis.clearTimeout(this.resizeFrame);
      this.resizeFrame = null;
    }
  }

  getApplication() {
    return this.app;
  }

  getLayers() {
    return this.layers;
  }

  getProjection() {
    return this.projection;
  }

  destroy() {
    if (this.destroyed) {
      return false;
    }
    this.destroyed = true;
    this.textEntryActive = false;
    this.cancelTextEntryProjectionRelease();
    this.projectionManager.unlockTextEntry({ force: true });
    this.splashViewportActive = false;
    this.canvas.classList?.remove('is-splash-viewport');
    this.removeListeners();
    this.listeners.clear();
    this.app?.destroy({ removeView: false }, { children: true });
    this.app = null;
    this.layers = null;
    this.projection = null;
    this.initializePromise = null;
    return true;
  }
}

import { gameViewport } from '../../viewport/gameViewport.js';

function readPixiDomMirrorEnabled() {
  return import.meta.env?.VITE_ENABLE_PIXI_DOM_MIRROR === 'true';
}

export class CanvasManager {
  constructor({ viewport = gameViewport, domMirrorEnabled = readPixiDomMirrorEnabled() } = {}) {
    this.viewport = viewport;
    this.domMirrorEnabled = domMirrorEnabled;
    this.canvas = null;
    this.stage = null;
    this.app = null;
    this.pixi = null;
    this.layers = null;
    this.domMirrorManager = null;
    this.initPromise = null;
    this.destroyed = false;
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
    this.canvas.width = this.viewport.width;
    this.canvas.height = this.viewport.height;
    this.syncCanvasCssSize();
    stage.append(this.canvas);
    this.stage = stage;
    this.destroyed = false;

    if (this.domMirrorEnabled) {
      void this.ensureApp();
    }

    return this.canvas;
  }

  unmount() {
    this.destroyed = true;
    this.domMirrorManager?.unmount();
    this.domMirrorManager = null;
    this.app?.destroy({ removeView: false }, { children: true });
    this.app = null;
    this.pixi = null;
    this.layers = null;
    this.initPromise = null;
    this.canvas?.remove();
    this.canvas = null;
    this.stage = null;
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
      this.initPromise = this.initApp().finally(() => {
        this.initPromise = null;
      });
    }

    return this.initPromise;
  }

  async initApp() {
    if (this.destroyed || !this.canvas) {
      return null;
    }

    const { Application, Container } = await import('pixi.js');

    if (this.destroyed || !this.canvas) {
      return null;
    }

    const app = new Application();
    await app.init({
      canvas: this.canvas,
      width: this.viewport.width,
      height: this.viewport.height,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    this.syncCanvasCssSize();

    if (this.destroyed) {
      app.destroy({ removeView: false }, { children: true });
      return null;
    }

    this.pixi = { Application, Container };
    this.app = app;
    this.layers = this.createLayers({ Container });
    app.stage.addChild(this.layers.root);

    if (this.domMirrorEnabled) {
      await this.startDomMirror();
    }

    return app;
  }

  async startDomMirror() {
    if (!this.stage || !this.canvas || !this.layers) {
      return;
    }

    const { PixiDomMirrorManager } = await import('../pixi/PixiDomMirrorManager.js');

    if (this.destroyed || !this.stage || !this.canvas || !this.layers) {
      return;
    }

    this.domMirrorManager?.unmount();
    this.domMirrorManager = new PixiDomMirrorManager({
      stage: this.stage,
      canvas: this.canvas,
      layers: this.layers,
    });
    this.domMirrorManager.mount();
  }

  syncCanvasCssSize() {
    if (!this.canvas) {
      return;
    }

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  createLayers({ Container }) {
    const root = new Container();
    root.label = 'gameRoot';
    root.eventMode = 'passive';

    const background = new Container();
    background.label = 'backgroundLayer';
    background.eventMode = 'none';

    const ui = new Container();
    ui.label = 'uiLayer';
    ui.scale.set(3);
    ui.eventMode = 'passive';

    const popup = new Container();
    popup.label = 'popupLayer';
    popup.scale.set(3);
    popup.eventMode = 'passive';

    const overlay = new Container();
    overlay.label = 'overlayLayer';
    overlay.scale.set(3);
    overlay.eventMode = 'passive';

    root.addChild(background, ui, popup, overlay);

    return {
      root,
      background,
      ui,
      popup,
      overlay,
      viewport: this.viewport,
      sourceScale: 3,
      sourceWidth: this.viewport.width / 3,
      sourceHeight: this.viewport.height / 3,
    };
  }
}

import { CanvasManager } from './managers/CanvasManager.js';
import { FpsDisplayManager } from './managers/FpsDisplayManager.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';
import { PixiProgressOverlayManager } from './pixi/PixiProgressOverlayManager.js';
import { SpineRuntimeFacade } from './spine/SpineRuntimeFacade.js';

function readFpsDisplayEnabled() {
  return Boolean(import.meta.env.DEV);
}

export class RenderFacade {
  static explain =
    'Owns the Pixi drawing surface and the steady clock that gameplay systems use.';

  constructor({
    canvasManager = new CanvasManager(),
    fpsDisplayManager = null,
    renderLoopManager = new RenderLoopManager(),
    showFpsDisplay = readFpsDisplayEnabled(),
    pixiProgressOverlayManager = null,
    spineRuntimeFacade = null,
  } = {}) {
    this.canvasManager = canvasManager;
    this.showFpsDisplay = showFpsDisplay;
    this.fpsDisplayManager =
      fpsDisplayManager ?? (showFpsDisplay ? new FpsDisplayManager() : null);
    this.renderLoopManager = renderLoopManager;
    this.pixiProgressOverlayManager =
      pixiProgressOverlayManager ??
      new PixiProgressOverlayManager({
        whenPixiReady: () => this.canvasManager.whenReady(),
        getLayers: () => this.canvasManager.getPixiLayers(),
        getCanvas: () => this.canvasManager.getCanvas(),
      });
    this.spineRuntimeFacade = spineRuntimeFacade ?? new SpineRuntimeFacade({
      whenPixiReady: () => this.canvasManager.whenReady(),
      getLayers: () => this.canvasManager.getPixiLayers(),
    });
  }

  mount(stage) {
    this.canvasManager.mount(stage);
    this.pixiProgressOverlayManager?.mount(stage);
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.mount(stage);
    }
  }

  unmount() {
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.unmount();
    }
    this.pixiProgressOverlayManager?.unmount();
    this.canvasManager.unmount();
  }

  startFrameLoop(onFrame) {
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.reset();
    }
    this.renderLoopManager.start((frame) => {
      if (this.showFpsDisplay) {
        this.fpsDisplayManager?.update(frame);
      }
      onFrame?.(frame);
    });
  }

  stopFrameLoop() {
    this.renderLoopManager.stop();
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.reset();
    }
  }

  getCanvas() {
    return this.canvasManager.getCanvas();
  }

  getPixiApp() {
    return this.canvasManager.getPixiApp();
  }

  getPixiLayers() {
    return this.canvasManager.getPixiLayers();
  }

  getPixiProgressOverlayManager() {
    return this.pixiProgressOverlayManager;
  }

  whenPixiReady() {
    return this.canvasManager.whenReady();
  }

  getSpineRuntime() {
    return this.spineRuntimeFacade;
  }
}

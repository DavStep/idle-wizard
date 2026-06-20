import { CanvasManager } from './managers/CanvasManager.js';
import { FpsDisplayManager } from './managers/FpsDisplayManager.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';
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
    spineRuntimeFacade = null,
  } = {}) {
    this.canvasManager = canvasManager;
    this.showFpsDisplay = showFpsDisplay;
    this.fpsDisplayManager =
      fpsDisplayManager ?? (showFpsDisplay ? new FpsDisplayManager() : null);
    this.renderLoopManager = renderLoopManager;
    this.spineRuntimeFacade = spineRuntimeFacade ?? new SpineRuntimeFacade({
      whenPixiReady: () => this.canvasManager.whenReady(),
      getLayers: () => this.canvasManager.getPixiLayers(),
    });
  }

  mount(stage) {
    this.canvasManager.mount(stage);
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.mount(stage);
    }
  }

  unmount() {
    if (this.showFpsDisplay) {
      this.fpsDisplayManager?.unmount();
    }
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

  whenPixiReady() {
    return this.canvasManager.whenReady();
  }

  getSpineRuntime() {
    return this.spineRuntimeFacade;
  }
}

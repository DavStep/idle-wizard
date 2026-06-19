import { CanvasManager } from './managers/CanvasManager.js';
import { FpsDisplayManager } from './managers/FpsDisplayManager.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';
import { SpineRuntimeFacade } from './spine/SpineRuntimeFacade.js';

export class RenderFacade {
  static explain =
    'Owns the Pixi drawing surface and the steady clock that gameplay systems use.';

  constructor() {
    this.canvasManager = new CanvasManager();
    this.fpsDisplayManager = new FpsDisplayManager();
    this.renderLoopManager = new RenderLoopManager();
    this.spineRuntimeFacade = new SpineRuntimeFacade({
      whenPixiReady: () => this.canvasManager.whenReady(),
      getLayers: () => this.canvasManager.getPixiLayers(),
    });
  }

  mount(stage) {
    this.canvasManager.mount(stage);
    this.fpsDisplayManager.mount(stage);
  }

  unmount() {
    this.fpsDisplayManager.unmount();
    this.canvasManager.unmount();
  }

  startFrameLoop(onFrame) {
    this.fpsDisplayManager.reset();
    this.renderLoopManager.start((frame) => {
      this.fpsDisplayManager.update(frame);
      onFrame?.(frame);
    });
  }

  stopFrameLoop() {
    this.renderLoopManager.stop();
    this.fpsDisplayManager.reset();
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

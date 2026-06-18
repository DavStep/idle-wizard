import { CanvasManager } from './managers/CanvasManager.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';
import { SpineRuntimeFacade } from './spine/SpineRuntimeFacade.js';

export class RenderFacade {
  static explain =
    'Owns the Pixi drawing surface and the steady clock that gameplay systems use.';

  constructor() {
    this.canvasManager = new CanvasManager();
    this.renderLoopManager = new RenderLoopManager();
    this.spineRuntimeFacade = new SpineRuntimeFacade({
      whenPixiReady: () => this.canvasManager.whenReady(),
      getLayers: () => this.canvasManager.getPixiLayers(),
    });
  }

  mount(stage) {
    this.canvasManager.mount(stage);
  }

  unmount() {
    this.canvasManager.unmount();
  }

  startFrameLoop(onFrame) {
    this.renderLoopManager.start(onFrame);
  }

  stopFrameLoop() {
    this.renderLoopManager.stop();
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

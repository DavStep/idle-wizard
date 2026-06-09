import { CanvasManager } from './managers/CanvasManager.js';
import { RenderLoopManager } from './managers/RenderLoopManager.js';

export class RenderFacade {
  static explain =
    'Owns the blank drawing surface and the steady clock that future systems can use.';

  constructor() {
    this.canvasManager = new CanvasManager();
    this.renderLoopManager = new RenderLoopManager();
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
}

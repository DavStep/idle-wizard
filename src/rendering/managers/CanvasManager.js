import { gameViewport } from '../../viewport/gameViewport.js';

export class CanvasManager {
  constructor({ viewport = gameViewport } = {}) {
    this.viewport = viewport;
    this.canvas = null;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('CanvasManager requires a stage element.');
    }

    if (this.canvas) {
      return this.canvas;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.canvas.width = this.viewport.width;
    this.canvas.height = this.viewport.height;
    stage.append(this.canvas);

    return this.canvas;
  }

  unmount() {
    this.canvas?.remove();
    this.canvas = null;
  }

  getCanvas() {
    return this.canvas;
  }
}

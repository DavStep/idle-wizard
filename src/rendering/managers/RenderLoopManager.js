export class RenderLoopManager {
  constructor() {
    this.frameId = 0;
    this.lastTime = 0;
    this.onFrame = null;
  }

  start(onFrame) {
    if (this.frameId) {
      return;
    }

    this.onFrame = onFrame;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame((time) => this.tick(time));
  }

  stop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }

    this.frameId = 0;
    this.lastTime = 0;
    this.onFrame = null;
  }

  tick(time) {
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.onFrame?.({ time, deltaSeconds });
    this.frameId = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }
}

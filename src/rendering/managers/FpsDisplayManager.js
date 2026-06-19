const DEFAULT_SAMPLE_INTERVAL_MS = 500;

export class FpsDisplayManager {
  constructor({ sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS } = {}) {
    this.sampleIntervalMs = sampleIntervalMs;
    this.root = null;
    this.sampleStartedAt = null;
    this.frameCount = 0;
  }

  mount(stage) {
    if (!stage) {
      throw new Error('FpsDisplayManager requires a stage element.');
    }

    if (this.root) {
      return this.root;
    }

    const document = stage.ownerDocument;
    const root = document.createElement('div');
    root.className = 'app-fps-display';
    root.setAttribute('aria-hidden', 'true');
    root.textContent = '0 fps';

    (stage.parentElement ?? stage).append(root);
    this.root = root;
    this.reset();

    return root;
  }

  unmount() {
    this.root?.remove();
    this.root = null;
    this.reset();
  }

  reset() {
    this.sampleStartedAt = null;
    this.frameCount = 0;
    this.setText('0 fps');
  }

  update(frame = {}) {
    if (!this.root) {
      return;
    }

    const time = Number(frame.time);
    if (!Number.isFinite(time)) {
      return;
    }

    if (this.sampleStartedAt === null) {
      this.sampleStartedAt = time;
      this.frameCount = 0;
      return;
    }

    this.frameCount += 1;
    const elapsedMs = time - this.sampleStartedAt;
    if (elapsedMs < this.sampleIntervalMs || elapsedMs <= 0) {
      return;
    }

    const fps = Math.max(0, Math.round((this.frameCount * 1000) / elapsedMs));
    this.setText(`${fps} fps`);
    this.sampleStartedAt = time;
    this.frameCount = 0;
  }

  setText(text) {
    if (this.root && this.root.textContent !== text) {
      this.root.textContent = text;
    }
  }
}

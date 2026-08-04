export class UiEditorLabClock {
  constructor({
    cancelFrame = defaultCancelFrame,
    now = defaultNow,
    requestFrame = defaultRequestFrame,
  } = {}) {
    this.cancelFrame = cancelFrame;
    this.nowSource = now;
    this.requestFrame = requestFrame;
    this.currentMs = 0;
    this.playing = false;
    this.lastFrameMs = null;
    this.frame = null;
    this.listeners = new Set();
    this.tick = (timestamp) => this.onFrame(timestamp);
  }

  now() {
    return this.currentMs;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play() {
    if (this.playing) {
      return false;
    }
    this.playing = true;
    this.lastFrameMs = this.nowSource();
    this.scheduleFrame();
    this.notify();
    return true;
  }

  pause() {
    if (!this.playing) {
      return false;
    }
    this.playing = false;
    this.lastFrameMs = null;
    if (this.frame !== null) {
      this.cancelFrame(this.frame);
      this.frame = null;
    }
    this.notify();
    return true;
  }

  advance(milliseconds) {
    const amount = Math.max(0, Number(milliseconds) || 0);
    if (amount <= 0) {
      return false;
    }
    this.currentMs += amount;
    this.notify();
    return true;
  }

  reset(milliseconds = 0) {
    this.currentMs = Math.max(0, Number(milliseconds) || 0);
    this.lastFrameMs = this.playing ? this.nowSource() : null;
    this.notify();
  }

  onFrame(timestamp) {
    this.frame = null;
    if (!this.playing) {
      return;
    }
    const nextTimestamp = Number.isFinite(Number(timestamp))
      ? Number(timestamp)
      : this.nowSource();
    const elapsed = Math.max(
      0,
      Math.min(250, nextTimestamp - (this.lastFrameMs ?? nextTimestamp)),
    );
    this.lastFrameMs = nextTimestamp;
    this.currentMs += elapsed;
    this.notify();
    this.scheduleFrame();
  }

  scheduleFrame() {
    if (this.frame === null && this.playing) {
      this.frame = this.requestFrame(this.tick);
    }
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.currentMs, this.playing);
    }
  }

  destroy() {
    this.pause();
    this.listeners.clear();
  }
}

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function defaultRequestFrame(callback) {
  return globalThis.requestAnimationFrame(callback);
}

function defaultCancelFrame(frame) {
  globalThis.cancelAnimationFrame(frame);
}


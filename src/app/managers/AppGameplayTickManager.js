export class AppGameplayTickManager {
  constructor({
    now = () => globalThis.performance?.now?.() ?? Date.now(),
    setTimeoutFn = (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeoutFn = (timeoutId) => globalThis.clearTimeout(timeoutId),
  } = {}) {
    this.now = now;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.started = false;
    this.timeoutId = null;
    this.timeoutDueTime = Number.POSITIVE_INFINITY;
    this.lastTime = 0;
    this.onTick = null;
    this.ticking = false;
  }

  start(onTick) {
    if (this.started) {
      return;
    }

    this.started = true;
    this.onTick = onTick;
    this.lastTime = this.now();
    this.requestTick(0);
  }

  stop() {
    this.clearScheduledTick();
    this.started = false;
    this.lastTime = 0;
    this.onTick = null;
    this.ticking = false;
  }

  requestTick(delayMs = 0) {
    if (!this.started) {
      return false;
    }

    const normalizedDelayMs = this.normalizeDelayMs(delayMs);
    if (normalizedDelayMs === null) {
      return false;
    }

    const requestTime = this.now();
    const dueTime = requestTime + normalizedDelayMs;
    if (this.timeoutId !== null && dueTime >= this.timeoutDueTime) {
      return false;
    }

    if (!this.ticking) {
      this.lastTime = requestTime;
    }
    this.clearScheduledTick();
    this.timeoutDueTime = dueTime;
    this.timeoutId = this.setTimeoutFn(() => this.tick(), normalizedDelayMs);
    return true;
  }

  tick() {
    if (!this.started) {
      return;
    }

    this.timeoutId = null;
    this.timeoutDueTime = Number.POSITIVE_INFINITY;

    const time = this.now();
    const rawDeltaSeconds = Math.max(0, (time - this.lastTime) / 1000);
    const frame = {
      time,
      deltaSeconds: Math.min(rawDeltaSeconds, 0.1),
      timerDeltaSeconds: rawDeltaSeconds,
    };
    this.lastTime = time;

    this.ticking = true;
    try {
      const nextDelayMs = this.onTick?.(frame);
      this.requestTick(nextDelayMs);
    } finally {
      this.ticking = false;
    }
  }

  normalizeDelayMs(delayMs) {
    if (!Number.isFinite(delayMs)) {
      return null;
    }

    return Math.max(0, Math.floor(delayMs));
  }

  clearScheduledTick() {
    if (this.timeoutId !== null) {
      this.clearTimeoutFn(this.timeoutId);
    }

    this.timeoutId = null;
    this.timeoutDueTime = Number.POSITIVE_INFINITY;
  }
}

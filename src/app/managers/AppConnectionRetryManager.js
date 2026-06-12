const DEFAULT_RETRY_DELAYS_MS = [1000, 2500, 5000];

export class AppConnectionRetryManager {
  constructor({
    delaysMs = DEFAULT_RETRY_DELAYS_MS,
    setTimeoutFn = globalThis.setTimeout.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
  } = {}) {
    this.delaysMs = delaysMs;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.timeoutId = null;
    this.retryCount = 0;
  }

  schedule(callback) {
    this.clear();

    const delayMs = this.getNextDelayMs();
    this.retryCount += 1;
    this.timeoutId = this.setTimeoutFn(() => {
      this.timeoutId = null;
      callback?.();
    }, delayMs);

    return delayMs;
  }

  reset() {
    this.retryCount = 0;
    this.clear();
  }

  clear() {
    if (this.timeoutId !== null) {
      this.clearTimeoutFn(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getNextDelayMs() {
    const index = Math.min(this.retryCount, this.delaysMs.length - 1);
    return this.delaysMs[index] ?? DEFAULT_RETRY_DELAYS_MS[0];
  }
}

import { describe, expect, it, vi } from 'vitest';

import { AppConnectionRetryManager } from './AppConnectionRetryManager.js';

describe('AppConnectionRetryManager', () => {
  it('schedules retries with capped delay and clears older timers', () => {
    const timers = [];
    const clearTimeoutFn = vi.fn();
    const manager = new AppConnectionRetryManager({
      delaysMs: [10, 20],
      setTimeoutFn: (callback, delayMs) => {
        const timer = { callback, delayMs };
        timers.push(timer);
        return timer;
      },
      clearTimeoutFn,
    });
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    expect(manager.schedule(firstCallback)).toBe(10);
    expect(manager.schedule(secondCallback)).toBe(20);

    expect(clearTimeoutFn).toHaveBeenCalledWith(timers[0]);
    timers[1].callback();
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);

    expect(manager.schedule(vi.fn())).toBe(20);
    manager.reset();
    expect(manager.schedule(vi.fn())).toBe(10);
  });
});

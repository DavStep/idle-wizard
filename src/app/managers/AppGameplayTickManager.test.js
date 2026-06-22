import { describe, expect, it, vi } from 'vitest';

import { AppGameplayTickManager } from './AppGameplayTickManager.js';

function createTickManager() {
  let now = 0;
  let nextTimeoutId = 1;
  const scheduled = new Map();
  const setTimeoutFn = vi.fn((callback, delayMs) => {
    const timeoutId = nextTimeoutId;
    nextTimeoutId += 1;
    scheduled.set(timeoutId, { callback, delayMs });
    return timeoutId;
  });
  const clearTimeoutFn = vi.fn((timeoutId) => {
    scheduled.delete(timeoutId);
  });
  const manager = new AppGameplayTickManager({
    now: () => now,
    setTimeoutFn,
    clearTimeoutFn,
  });

  return {
    manager,
    setNow: (value) => {
      now = value;
    },
    runTimeout: (timeoutId = [...scheduled.keys()][0]) => {
      const timeout = scheduled.get(timeoutId);
      scheduled.delete(timeoutId);
      timeout.callback();
    },
    scheduled,
    setTimeoutFn,
    clearTimeoutFn,
  };
}

describe('AppGameplayTickManager', () => {
  it('starts with an immediate tick and reschedules from the callback delay', () => {
    const { manager, runTimeout, scheduled, setNow, setTimeoutFn } =
      createTickManager();
    const onTick = vi.fn(() => 1000);

    manager.start(onTick);

    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 0);

    setNow(250);
    runTimeout();

    expect(onTick).toHaveBeenCalledWith({
      time: 250,
      deltaSeconds: 0.1,
      timerDeltaSeconds: 0.25,
    });
    expect([...scheduled.values()][0].delayMs).toBe(1000);
  });

  it('sleeps when the callback returns no finite delay', () => {
    const { manager, runTimeout, scheduled } = createTickManager();

    manager.start(() => null);
    runTimeout();

    expect(scheduled.size).toBe(0);
  });

  it('lets a wake request move the next tick earlier', () => {
    const { manager, clearTimeoutFn, runTimeout, scheduled, setNow } =
      createTickManager();

    manager.start(() => 1000);
    runTimeout();
    setNow(100);
    manager.requestTick(50);

    expect(clearTimeoutFn).toHaveBeenCalledTimes(1);
    expect([...scheduled.values()][0].delayMs).toBe(50);
  });

  it('ignores wake requests that are later than the scheduled tick', () => {
    const { manager, clearTimeoutFn, runTimeout, scheduled, setNow } =
      createTickManager();

    manager.start(() => 1000);
    runTimeout();
    setNow(100);
    manager.requestTick(2000);

    expect(clearTimeoutFn).not.toHaveBeenCalled();
    expect([...scheduled.values()][0].delayMs).toBe(1000);
  });

  it('clears the pending tick when stopped', () => {
    const { manager, clearTimeoutFn } = createTickManager();

    manager.start(() => 1000);
    manager.stop();

    expect(clearTimeoutFn).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveSendManager } from './GameplaySaveSendManager.js';

describe('GameplaySaveSendManager', () => {
  it('sends gameplay save JSON through the generated reducer', () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 12 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 12 } }),
    });
  });

  it('queues the latest save until a connection is hydrated', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    expect(manager.save({ version: 2, gold: { current: 1 } })).toBe(true);
    manager.save({ version: 2, gold: { current: 2 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });

    expect(set_player_gameplay_save).not.toHaveBeenCalled();

    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledTimes(1);
    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 2 } }),
    });
  });

  it('drops saves made before server hydration when requested', () => {
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.save({ version: 2, gold: { current: 1 } });
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.discardPreHydrationSave();
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).not.toHaveBeenCalled();
  });

  it('keeps saves made after server hydration across reconnects', () => {
    const failingSetPlayerGameplaySave = vi.fn(() => {
      throw new Error('offline');
    });
    const set_player_gameplay_save = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        set_player_gameplay_save: failingSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 3 } });
    manager.disconnect();
    manager.discardPreHydrationSave();
    manager.connect({
      reducers: {
        set_player_gameplay_save,
      },
    });
    manager.setReadyToSend(true);

    expect(set_player_gameplay_save).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 3 } }),
    });
  });

  it('keeps an in-flight save across disconnects before the reducer ack', async () => {
    let resolveFirstSave;
    const firstSetPlayerGameplaySave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFirstSave = resolve;
        }),
    );
    const secondSetPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave: firstSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 3 } });

    expect(firstSetPlayerGameplaySave).toHaveBeenCalledTimes(1);

    manager.disconnect();
    manager.discardPreHydrationSave();
    manager.connect({
      reducers: {
        setPlayerGameplaySave: secondSetPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    expect(secondSetPlayerGameplaySave).toHaveBeenCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 3 } }),
    });

    resolveFirstSave();
    await Promise.resolve();
  });

  it('times out a stuck reducer ack and keeps the newest pending save', async () => {
    let timeoutCallback;
    const setTimeoutFn = vi.fn((callback) => {
      timeoutCallback = callback;
      return 'timer-1';
    });
    const clearTimeoutFn = vi.fn();
    const onSyncUnhealthy = vi.fn();
    const setPlayerGameplaySave = vi.fn(() => new Promise(() => {}));
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 50,
      setTimeoutFn,
      clearTimeoutFn,
      onSyncUnhealthy,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush({ version: 2, gold: { current: 1 } });
    manager.save({ version: 2, gold: { current: 2 } });

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 50);

    timeoutCallback();

    await expect(flush).resolves.toBe(false);
    expect(onSyncUnhealthy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'gameplay_save_timeout' }),
    );
    expect(manager.pendingSaveJson).toBe(
      JSON.stringify({ version: 2, gold: { current: 2 } }),
    );
    expect(manager.syncPromise).toBeNull();
    expect(clearTimeoutFn).not.toHaveBeenCalled();
  });

  it('waits for a save to flush when requested', async () => {
    let resolveSave;
    const setPlayerGameplaySave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);

    const flush = manager.saveAndFlush({ version: 2, gold: { current: 9 } });
    let settled = false;
    flush.then(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    resolveSave();

    await expect(flush).resolves.toBe(true);
    expect(settled).toBe(true);
  });

  it('does not resend saves when only savedAt changed', async () => {
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({ syncTimeoutMs: 0 });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, savedAt: 100, gold: { current: 9 } });
    await Promise.resolve();
    await Promise.resolve();

    manager.save({ version: 2, savedAt: 200, gold: { current: 9 } });
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
  });

  it('throttles repeated sends within the sync interval', async () => {
    let nowMs = 1_000;
    let scheduledFlush;
    const setTimeoutFn = vi.fn((callback, delayMs) => {
      scheduledFlush = callback;
      return { delayMs };
    });
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      syncIntervalMs: 60_000,
      setTimeoutFn,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 1 } });
    await Promise.resolve();
    await Promise.resolve();

    nowMs += 5_000;
    manager.save({ version: 2, gold: { current: 2 } });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 55_000);

    nowMs += 55_000;
    scheduledFlush();
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(2);
    expect(setPlayerGameplaySave).toHaveBeenLastCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 2 } }),
    });
  });

  it('uses a short default sync interval so reloads lose less recent progress', async () => {
    let nowMs = 1_000;
    let scheduledDelayMs = null;
    const setTimeoutFn = vi.fn((callback, delayMs) => {
      scheduledDelayMs = delayMs;
      return { callback, delayMs };
    });
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      setTimeoutFn,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 1 } });
    await manager.syncPromise;
    await Promise.resolve();

    nowMs += 1_000;
    manager.save({ version: 2, gold: { current: 2 } });
    await Promise.resolve();

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(1);
    expect(scheduledDelayMs).toBe(4_000);
  });

  it('bypasses the sync interval when a flush is forced', async () => {
    let nowMs = 1_000;
    const setPlayerGameplaySave = vi.fn(() => Promise.resolve());
    const manager = new GameplaySaveSendManager({
      syncTimeoutMs: 0,
      syncIntervalMs: 60_000,
      now: () => nowMs,
    });

    manager.connect({
      reducers: {
        setPlayerGameplaySave,
      },
    });
    manager.setReadyToSend(true);
    manager.save({ version: 2, gold: { current: 1 } });
    await Promise.resolve();

    nowMs += 5_000;
    await expect(
      manager.saveAndFlush({ version: 2, gold: { current: 2 } }),
    ).resolves.toBe(true);

    expect(setPlayerGameplaySave).toHaveBeenCalledTimes(2);
    expect(setPlayerGameplaySave).toHaveBeenLastCalledWith({
      saveJson: JSON.stringify({ version: 2, gold: { current: 2 } }),
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { LeaderboardGeneratedGoldSyncManager } from './LeaderboardGeneratedGoldSyncManager.js';

function createGameplayFacade(initialTotalGeneratedGold = 0) {
  const listeners = new Set();
  let snapshot = {
    gold: {
      totalGenerated: initialTotalGeneratedGold,
    },
  };

  return {
    getSnapshot: () => snapshot,
    publishGoldTotal(totalGeneratedGold) {
      snapshot = {
        gold: {
          totalGenerated: totalGeneratedGold,
        },
      };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

describe('LeaderboardGeneratedGoldSyncManager', () => {
  it('reports saved and earned generated gold totals through the reducer', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(12);
    const manager = new LeaderboardGeneratedGoldSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 12n });

    gameplayFacade.publishGoldTotal(112);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenLastCalledWith({ totalGeneratedGold: 112n });
    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(2);
  });

  it('does not resend unchanged frame snapshots', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(3);
    const manager = new LeaderboardGeneratedGoldSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishGoldTotal(3);
    gameplayFacade.publishGoldTotal(3);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(1);
  });

  it('resends the current generated gold total when a new connection attaches', async () => {
    const firstSetTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const secondSetTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(11);
    const manager = new LeaderboardGeneratedGoldSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold: firstSetTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    manager.disconnect();
    manager.connect({
      reducers: {
        setTotalGeneratedGold: secondSetTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    expect(firstSetTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 11n });
    expect(secondSetTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 11n });
  });

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(7);
    const manager = new LeaderboardGeneratedGoldSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        set_total_generated_gold: setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 7n });
  });

  it('does not report small generated gold deltas after the initial sync', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(10);
    const manager = new LeaderboardGeneratedGoldSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishGoldTotal(99);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(1);

    gameplayFacade.publishGoldTotal(110);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenLastCalledWith({ totalGeneratedGold: 110n });
    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(2);
  });

  it('throttles generated gold reports after the initial connection sync', async () => {
    let nowMs = 0;
    let scheduled = null;
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(10);
    const manager = new LeaderboardGeneratedGoldSyncManager({
      syncIntervalMs: 1_000,
      now: () => nowMs,
      setTimeoutFn: (callback, delayMs) => {
        scheduled = { callback, delayMs };
        return 1;
      },
      clearTimeoutFn: () => {
        scheduled = null;
      },
    });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold,
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    gameplayFacade.publishGoldTotal(110);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(1);
    expect(scheduled?.delayMs).toBe(1_000);

    nowMs = 1_000;
    scheduled.callback();
    await Promise.resolve();
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(2);
    expect(setTotalGeneratedGold).toHaveBeenLastCalledWith({ totalGeneratedGold: 110n });
  });
});

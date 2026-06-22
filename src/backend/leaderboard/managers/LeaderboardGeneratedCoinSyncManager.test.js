import { describe, expect, it, vi } from 'vitest';

import { LeaderboardGeneratedCoinSyncManager } from './LeaderboardGeneratedCoinSyncManager.js';

function createGameplayFacade(initialTotalGeneratedCoin = 0) {
  const listeners = new Set();
  let snapshot = {
    coin: {
      totalGenerated: initialTotalGeneratedCoin,
    },
  };

  return {
    getSnapshot: () => snapshot,
    publishCoinTotal(totalGeneratedCoin) {
      snapshot = {
        coin: {
          totalGenerated: totalGeneratedCoin,
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

describe('LeaderboardGeneratedCoinSyncManager', () => {
  it('reports saved and earned generated coin totals through the reducer', async () => {
    const setTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(12);
    const manager = new LeaderboardGeneratedCoinSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledWith({ totalGeneratedCoin: 12n });

    gameplayFacade.publishCoinTotal(112);
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenLastCalledWith({ totalGeneratedCoin: 112n });
    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(2);
  });

  it('does not resend unchanged frame snapshots', async () => {
    const setTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(3);
    const manager = new LeaderboardGeneratedCoinSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishCoinTotal(3);
    gameplayFacade.publishCoinTotal(3);
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(1);
  });

  it('resends the current generated coin total when a new connection attaches', async () => {
    const firstSetTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const secondSetTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(11);
    const manager = new LeaderboardGeneratedCoinSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedCoin: firstSetTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    manager.disconnect();
    manager.connect({
      reducers: {
        setTotalGeneratedCoin: secondSetTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    expect(firstSetTotalGeneratedCoin).toHaveBeenCalledWith({ totalGeneratedCoin: 11n });
    expect(secondSetTotalGeneratedCoin).toHaveBeenCalledWith({ totalGeneratedCoin: 11n });
  });

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const setTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(7);
    const manager = new LeaderboardGeneratedCoinSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        set_total_generated_coin: setTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledWith({ totalGeneratedCoin: 7n });
  });

  it('does not report small generated coin deltas after the initial sync', async () => {
    const setTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(10);
    const manager = new LeaderboardGeneratedCoinSyncManager({ syncIntervalMs: 0 });

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedCoin,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishCoinTotal(99);
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(1);

    gameplayFacade.publishCoinTotal(110);
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenLastCalledWith({ totalGeneratedCoin: 110n });
    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(2);
  });

  it('throttles generated coin reports after the initial connection sync', async () => {
    let nowMs = 0;
    let scheduled = null;
    const setTotalGeneratedCoin = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(10);
    const manager = new LeaderboardGeneratedCoinSyncManager({
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
        setTotalGeneratedCoin,
      },
    });
    await Promise.resolve();
    await Promise.resolve();

    gameplayFacade.publishCoinTotal(110);
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(1);
    expect(scheduled?.delayMs).toBe(1_000);

    nowMs = 1_000;
    scheduled.callback();
    await Promise.resolve();
    await Promise.resolve();

    expect(setTotalGeneratedCoin).toHaveBeenCalledTimes(2);
    expect(setTotalGeneratedCoin).toHaveBeenLastCalledWith({ totalGeneratedCoin: 110n });
  });
});

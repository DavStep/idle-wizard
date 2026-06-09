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
    const manager = new LeaderboardGeneratedGoldSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 12n });

    gameplayFacade.publishGoldTotal(15);
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenLastCalledWith({ totalGeneratedGold: 15n });
    expect(setTotalGeneratedGold).toHaveBeenCalledTimes(2);
  });

  it('does not resend unchanged frame snapshots', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(3);
    const manager = new LeaderboardGeneratedGoldSyncManager();

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

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const setTotalGeneratedGold = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(7);
    const manager = new LeaderboardGeneratedGoldSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        set_total_generated_gold: setTotalGeneratedGold,
      },
    });
    await Promise.resolve();

    expect(setTotalGeneratedGold).toHaveBeenCalledWith({ totalGeneratedGold: 7n });
  });
});

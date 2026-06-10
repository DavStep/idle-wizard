import { describe, expect, it, vi } from 'vitest';

import { PlayerLevelSyncManager } from './PlayerLevelSyncManager.js';

function createGameplayFacade(initialPlayerLevel = 1) {
  const listeners = new Set();
  let snapshot = {
    tasks: {
      currentLevel: initialPlayerLevel,
    },
  };

  return {
    getSnapshot: () => snapshot,
    publishPlayerLevel(playerLevel) {
      snapshot = {
        tasks: {
          currentLevel: playerLevel,
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

describe('PlayerLevelSyncManager', () => {
  it('reports saved and later player levels through the reducer', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(2);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 2 });

    gameplayFacade.publishPlayerLevel(3);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenLastCalledWith({ playerLevel: 3 });
    expect(setPlayerLevel).toHaveBeenCalledTimes(2);
  });

  it('does not resend unchanged frame snapshots', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(4);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishPlayerLevel(4);
    gameplayFacade.publishPlayerLevel(4);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledTimes(1);
  });

  it('reports lower player levels when progress has been reset', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(8);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    await Promise.resolve();

    gameplayFacade.publishPlayerLevel(1);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenLastCalledWith({ playerLevel: 1 });
    expect(setPlayerLevel).toHaveBeenCalledTimes(2);
  });

  it('keeps the latest reset level when an older sync fails', async () => {
    let rejectFirstSync;
    const setPlayerLevel = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirstSync = reject;
          }),
      )
      .mockResolvedValue();
    const gameplayFacade = createGameplayFacade(8);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    gameplayFacade.publishPlayerLevel(1);
    rejectFirstSync(new Error('sync failed'));
    await Promise.resolve();
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenLastCalledWith({ playerLevel: 1 });
  });

  it('uses snake-case reducer bindings when camel-case bindings are missing', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(5);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        set_player_level: setPlayerLevel,
      },
    });
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 5 });
  });
});

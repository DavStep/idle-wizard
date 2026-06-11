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
    manager.setReadyToSync(true);
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
    manager.setReadyToSync(true);
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
    manager.setReadyToSync(true);
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
    manager.setReadyToSync(true);
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
    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 5 });
  });

  it('waits for gameplay save hydration before reporting level', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(1);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    await Promise.resolve();

    expect(setPlayerLevel).not.toHaveBeenCalled();

    manager.markGameplaySaveHydrated();
    gameplayFacade.publishPlayerLevel(4);
    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledTimes(1);
    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 4 });
  });

  it('drops pre-hydration default level before syncing restored level', async () => {
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(1);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    manager.discardPreHydrationLevel();
    manager.markGameplaySaveHydrated();
    gameplayFacade.publishPlayerLevel(6);
    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledTimes(1);
    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 6 });
  });

  it('keeps hydrated pending level through reconnect discard', async () => {
    const failingSetPlayerLevel = vi.fn(() => {
      throw new Error('offline');
    });
    const setPlayerLevel = vi.fn(() => Promise.resolve());
    const gameplayFacade = createGameplayFacade(1);
    const manager = new PlayerLevelSyncManager();

    manager.setGameplayFacade(gameplayFacade);
    manager.markGameplaySaveHydrated();
    gameplayFacade.publishPlayerLevel(7);
    manager.connect({
      reducers: {
        setPlayerLevel: failingSetPlayerLevel,
      },
    });
    manager.setReadyToSync(true);
    manager.disconnect();
    manager.discardPreHydrationLevel();
    manager.connect({
      reducers: {
        setPlayerLevel,
      },
    });
    manager.markGameplaySaveHydrated();
    manager.setReadyToSync(true);
    await Promise.resolve();

    expect(setPlayerLevel).toHaveBeenCalledTimes(1);
    expect(setPlayerLevel).toHaveBeenCalledWith({ playerLevel: 7 });
  });
});

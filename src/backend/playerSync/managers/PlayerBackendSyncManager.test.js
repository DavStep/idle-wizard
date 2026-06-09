import { describe, expect, it, vi } from 'vitest';

import { PlayerBackendSyncManager } from './PlayerBackendSyncManager.js';

function createPlayerFacade(username) {
  const listeners = new Set();
  let snapshot = { username };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setUsername: (nextUsername) => {
      snapshot = { username: nextUsername };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('PlayerBackendSyncManager', () => {
  it('sends current username when a connection becomes available', () => {
    const setUsername = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('Merlin');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      reducers: {
        setUsername,
      },
    });

    expect(setUsername).toHaveBeenCalledWith({ username: 'Merlin' });
  });

  it('sends later username changes once each', () => {
    const setUsername = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      reducers: {
        setUsername,
      },
    });
    playerFacade.setUsername('Mira');
    playerFacade.setUsername('Mira');

    expect(setUsername).toHaveBeenCalledTimes(2);
    expect(setUsername).toHaveBeenLastCalledWith({ username: 'Mira' });
  });

  it('waits for server profile before syncing when player table exists', () => {
    const setUsername = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      db: {
        player: {},
      },
      reducers: {
        setUsername,
      },
    });

    expect(setUsername).not.toHaveBeenCalled();

    manager.applyServerProfile({ username: 'Server Mage' });

    expect(playerFacade.getSnapshot().username).toBe('Server Mage');
    expect(setUsername).not.toHaveBeenCalled();

    playerFacade.setUsername('Mira');

    expect(setUsername).toHaveBeenCalledTimes(1);
    expect(setUsername).toHaveBeenLastCalledWith({ username: 'Mira' });
  });

  it('keeps a username typed before server profile hydration and syncs it after', () => {
    const setUsername = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      db: {
        player: {},
      },
      reducers: {
        setUsername,
      },
    });

    playerFacade.setUsername('MobileDav');

    expect(setUsername).not.toHaveBeenCalled();

    manager.applyServerProfile({ username: 'wizard' });

    expect(playerFacade.getSnapshot().username).toBe('MobileDav');
    expect(setUsername).toHaveBeenCalledTimes(1);
    expect(setUsername).toHaveBeenLastCalledWith({ username: 'MobileDav' });
  });
});

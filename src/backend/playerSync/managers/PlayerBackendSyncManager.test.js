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
});

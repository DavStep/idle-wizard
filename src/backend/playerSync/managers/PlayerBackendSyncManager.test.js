import { describe, expect, it, vi } from 'vitest';

import { PlayerBackendSyncManager } from './PlayerBackendSyncManager.js';

function createPlayerFacade(username) {
  const listeners = new Set();
  let snapshot = {
    username,
    usernamePromptSeen: username !== 'wizard',
    theme: 'white',
    colorMode: 'monochrome',
  };

  return {
    getSnapshot: () => snapshot,
    getProfileSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    setUsername: (nextUsername) => {
      snapshot = {
        ...snapshot,
        username: nextUsername,
        usernamePromptSeen: true,
      };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    setTheme: (theme) => {
      snapshot = { ...snapshot, theme };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    applyServerProfile: (profile) => {
      snapshot = { ...snapshot, ...profile };

      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

describe('PlayerBackendSyncManager', () => {
  it('sends current profile when a connection becomes available', () => {
    const setPlayerProfile = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('Merlin');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      reducers: {
        setPlayerProfile,
      },
    });

    expect(setPlayerProfile).toHaveBeenCalledWith({
      username: 'Merlin',
      theme: 'white',
      colorMode: 'monochrome',
      usernamePromptSeen: true,
    });
  });

  it('sends later profile changes once each', () => {
    const setPlayerProfile = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      reducers: {
        setPlayerProfile,
      },
    });
    playerFacade.setUsername('Mira');
    playerFacade.setUsername('Mira');
    playerFacade.setTheme('black');

    expect(setPlayerProfile).toHaveBeenCalledTimes(3);
    expect(setPlayerProfile).toHaveBeenLastCalledWith({
      username: 'Mira',
      theme: 'black',
      colorMode: 'monochrome',
      usernamePromptSeen: true,
    });
  });

  it('waits for server profile before syncing when player table exists', () => {
    const setPlayerProfile = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      db: {
        player: {},
      },
      reducers: {
        setPlayerProfile,
      },
    });

    expect(setPlayerProfile).not.toHaveBeenCalled();

    manager.applyServerProfile({ username: 'Server Mage', theme: 'black' });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'Server Mage',
      theme: 'black',
    });
    expect(setPlayerProfile).not.toHaveBeenCalled();

    playerFacade.setUsername('Mira');

    expect(setPlayerProfile).toHaveBeenCalledTimes(1);
    expect(setPlayerProfile).toHaveBeenLastCalledWith({
      username: 'Mira',
      theme: 'black',
      colorMode: 'monochrome',
      usernamePromptSeen: true,
    });
  });

  it('keeps a profile changed before server profile hydration and syncs it after', () => {
    const setPlayerProfile = vi.fn(() => Promise.resolve());
    const playerFacade = createPlayerFacade('wizard');
    const manager = new PlayerBackendSyncManager();

    manager.setPlayerFacade(playerFacade);
    manager.connect({
      db: {
        player: {},
      },
      reducers: {
        setPlayerProfile,
      },
    });

    playerFacade.setUsername('MobileDav');
    playerFacade.setTheme('black');

    expect(setPlayerProfile).not.toHaveBeenCalled();

    manager.applyServerProfile({ username: 'wizard' });

    expect(playerFacade.getSnapshot()).toMatchObject({
      username: 'MobileDav',
      theme: 'black',
    });
    expect(setPlayerProfile).toHaveBeenCalledTimes(1);
    expect(setPlayerProfile).toHaveBeenLastCalledWith({
      username: 'MobileDav',
      theme: 'black',
      colorMode: 'monochrome',
      usernamePromptSeen: true,
    });
  });

  it('falls back to username reducer when profile reducer is missing', () => {
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
});

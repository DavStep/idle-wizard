import { describe, expect, it } from 'vitest';

import { AuthSessionManager } from './AuthSessionManager.js';
import { AuthTokenStorageManager } from './AuthTokenStorageManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('AuthSessionManager', () => {
  it('stores the SpacetimeDB token from a successful connection', async () => {
    const tokenStorageManager = new AuthTokenStorageManager({
      storage: createMemoryStorage(),
    });
    const sessionManager = new AuthSessionManager({ tokenStorageManager });

    sessionManager.acceptConnection({ identity: 'identity-1', token: 'token-1' });

    await expect(sessionManager.getConnectionToken()).resolves.toBe('token-1');
    expect(sessionManager.getSnapshot()).toEqual({
      hasToken: true,
      identity: 'identity-1',
      oidc: {
        authenticated: false,
        displayName: '',
        email: '',
        enabled: false,
        error: null,
      },
    });
  });

  it('uses an OIDC token before the stored anonymous token', async () => {
    const tokenStorageManager = new AuthTokenStorageManager({
      storage: createMemoryStorage(),
    });
    const sessionManager = new AuthSessionManager({
      tokenStorageManager,
      oidcManager: {
        getConnectionToken: () => Promise.resolve('oidc-token'),
        getSnapshot: () => ({
          enabled: true,
          authenticated: true,
          displayName: 'Dav',
          email: 'dav@example.com',
          error: null,
        }),
      },
    });

    sessionManager.acceptConnection({ identity: 'identity-1', token: 'stored-token' });

    await expect(sessionManager.getConnectionToken()).resolves.toBe('oidc-token');
  });

  it('does not clear gameplay progress when signing out', async () => {
    const storage = createMemoryStorage();
    const tokenStorageManager = new AuthTokenStorageManager({ storage });
    const sessionManager = new AuthSessionManager({ tokenStorageManager });
    const savedProgress = JSON.stringify({
      version: 2,
      gold: { current: 12 },
      inventory: [{ itemKey: 'sageSeed', quantity: 3 }],
    });

    storage.setItem('idle-wizard.gameplay.save', savedProgress);
    sessionManager.acceptConnection({ identity: 'identity-1', token: 'token-1' });

    await sessionManager.signOut();

    expect(storage.getItem('idle-wizard.spacetimedb.token')).toBeNull();
    expect(storage.getItem('idle-wizard.gameplay.save')).toBe(savedProgress);
  });
});

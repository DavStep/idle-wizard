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
  it('stores the SpacetimeDB token from a successful connection', () => {
    const tokenStorageManager = new AuthTokenStorageManager({
      storage: createMemoryStorage(),
    });
    const sessionManager = new AuthSessionManager({ tokenStorageManager });

    sessionManager.acceptConnection({ identity: 'identity-1', token: 'token-1' });

    expect(sessionManager.getConnectionToken()).toBe('token-1');
    expect(sessionManager.getSnapshot()).toEqual({
      hasToken: true,
      identity: 'identity-1',
    });
  });
});

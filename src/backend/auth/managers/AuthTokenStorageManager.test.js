import { describe, expect, it, vi } from 'vitest';

import { AuthTokenStorageManager } from './AuthTokenStorageManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

describe('AuthTokenStorageManager', () => {
  it('loads a native token when browser storage is empty and mirrors it back', async () => {
    const storage = createMemoryStorage();
    const nativeStorageManager = {
      loadToken: vi.fn(async () => 'native-token'),
      saveToken: vi.fn(async () => true),
      clearToken: vi.fn(async () => true),
    };
    const manager = new AuthTokenStorageManager({ storage, nativeStorageManager });

    await expect(manager.loadConnectionAuth()).resolves.toEqual({
      token: 'native-token',
      fallbackTokens: [],
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      'idle-wizard.spacetimedb.token',
      'native-token',
    );
    expect(manager.loadToken()).toBe('native-token');
  });

  it('keeps a different native token as a retry fallback', async () => {
    const storage = createMemoryStorage();
    storage.setItem('idle-wizard.spacetimedb.token', 'browser-token');
    const nativeStorageManager = {
      loadToken: vi.fn(async () => 'native-token'),
      saveToken: vi.fn(async () => true),
      clearToken: vi.fn(async () => true),
    };
    const manager = new AuthTokenStorageManager({ storage, nativeStorageManager });

    await expect(manager.loadConnectionAuth()).resolves.toEqual({
      token: 'browser-token',
      fallbackTokens: ['native-token'],
    });
  });

  it('saves and clears browser and native token copies', async () => {
    const storage = createMemoryStorage();
    const nativeStorageManager = {
      loadToken: vi.fn(async () => undefined),
      saveToken: vi.fn(async () => true),
      clearToken: vi.fn(async () => true),
    };
    const manager = new AuthTokenStorageManager({ storage, nativeStorageManager });

    await expect(manager.saveToken(' token-1 ')).resolves.toBe(true);

    expect(storage.getItem('idle-wizard.spacetimedb.token')).toBe('token-1');
    expect(nativeStorageManager.saveToken).toHaveBeenCalledWith('token-1');

    await manager.clearToken();

    expect(storage.getItem('idle-wizard.spacetimedb.token')).toBeNull();
    expect(nativeStorageManager.clearToken).toHaveBeenCalledTimes(1);
  });

  it('still persists through native storage when browser storage throws', async () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    const nativeStorageManager = {
      loadToken: vi.fn(async () => 'native-token'),
      saveToken: vi.fn(async () => true),
      clearToken: vi.fn(async () => true),
    };
    const manager = new AuthTokenStorageManager({ storage, nativeStorageManager });

    await expect(manager.saveToken('token-1')).resolves.toBe(true);
    await expect(manager.loadConnectionAuth()).resolves.toEqual({
      token: 'native-token',
      fallbackTokens: [],
    });
  });
});

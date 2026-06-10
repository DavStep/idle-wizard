import { describe, expect, it, vi } from 'vitest';

import { AuthOidcManager } from './AuthOidcManager.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
}

describe('AuthOidcManager', () => {
  it('stays disabled without a SpacetimeAuth client id', async () => {
    const manager = new AuthOidcManager({
      clientId: '',
      windowRef: null,
      storage: createMemoryStorage(),
    });

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: false,
      authenticated: false,
    });
  });

  it('processes a redirect callback and exposes the OIDC token', async () => {
    let capturedSettings = null;
    const user = {
      id_token: 'id-token',
      access_token: 'access-token',
      profile: {
        email: 'dav@example.com',
        name: 'Dav',
      },
    };
    const replaceState = vi.fn();
    const oidcClient = {
      signinCallback: vi.fn(() => Promise.resolve(user)),
      getUser: vi.fn(() => Promise.resolve(null)),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      basePath: '/idle-wizard/',
      storage: createMemoryStorage(),
      windowRef: {
        document: { title: 'Idle Wizard' },
        history: { replaceState },
        location: {
          origin: 'https://davstep.github.io',
          pathname: '/idle-wizard/',
          search: '?code=abc&state=def',
          hash: '',
          href: 'https://davstep.github.io/idle-wizard/?code=abc&state=def',
        },
      },
      createUserManager: (settings) => {
        capturedSettings = settings;
        return oidcClient;
      },
    });

    await manager.prepare();

    expect(capturedSettings.redirect_uri).toBe('https://davstep.github.io/idle-wizard/');
    expect(oidcClient.signinCallback).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({}, 'Idle Wizard', '/idle-wizard/');
    await expect(manager.getConnectionToken()).resolves.toBe('id-token');
    expect(manager.getSnapshot()).toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
  });
});

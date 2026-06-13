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
      disabledReason: 'config',
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
    const storage = createMemoryStorage();
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      basePath: '/idle-wizard/',
      storage,
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
    expect(capturedSettings.stateStore).toBeDefined();
    await capturedSettings.stateStore.set('callback-state', 'saved');
    expect(storage.getItem('idle-wizard.oidc.state.callback-state')).toBe(
      'saved',
    );
    expect(oidcClient.signinCallback).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({}, 'Idle Wizard', '/idle-wizard/');
    await expect(manager.getConnectionToken()).resolves.toBe('id-token');
    expect(manager.getSnapshot()).toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
      disabledReason: null,
    });
  });

  it('cleans the redirect URL when callback handling fails', async () => {
    const replaceState = vi.fn();
    const oidcClient = {
      signinCallback: vi.fn(() => Promise.reject(new Error('missing state'))),
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
      createUserManager: () => oidcClient,
    });

    await manager.prepare();

    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: 'missing state',
    });
    expect(replaceState).toHaveBeenCalledWith({}, 'Idle Wizard', '/idle-wizard/');
  });

  it('stays disabled on native builds by default', async () => {
    const addListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }));
    const getLaunchUrl = vi.fn(() =>
      Promise.resolve({
        url: 'com.idlewizard.game://auth/callback?code=abc&state=def',
      }),
    );
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      appPlugin: {
        addListener,
        getLaunchUrl,
      },
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
      createUserManager: () => {
        throw new Error('native OIDC should stay disabled');
      },
    });

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: false,
      authenticated: false,
      disabledReason: 'native',
    });
    await expect(manager.getConnectionToken()).resolves.toBeUndefined();
    expect(addListener).not.toHaveBeenCalled();
    expect(getLaunchUrl).not.toHaveBeenCalled();
  });

  it('uses the Android app callback URL when native OIDC is explicitly enabled', async () => {
    let capturedSettings = null;
    const user = {
      id_token: 'id-token',
      profile: {
        email: 'dav@example.com',
      },
    };
    const oidcClient = {
      signinCallback: vi.fn(() => Promise.resolve(user)),
      getUser: vi.fn(() => Promise.resolve(null)),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      mobileRedirectUri: 'https://davstep.github.io/idle-wizard/',
      nativeOidcEnabled: true,
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      appPlugin: {
        addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
        getLaunchUrl: vi.fn(() =>
          Promise.resolve({
            url: 'com.idlewizard.game://auth/callback?code=abc&state=def',
          }),
        ),
      },
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
      createUserManager: (settings) => {
        capturedSettings = settings;
        return oidcClient;
      },
    });

    await manager.prepare();

    expect(capturedSettings.redirect_uri).toBe(
      'https://davstep.github.io/idle-wizard/',
    );
    expect(oidcClient.signinCallback).toHaveBeenCalledWith(
      'com.idlewizard.game://auth/callback?code=abc&state=def',
    );
    await expect(manager.getConnectionToken()).resolves.toBe('id-token');
  });

  it('reports redirect start failures without leaving stale errors hidden', async () => {
    const oidcClient = {
      signinRedirect: vi.fn(() => Promise.reject(new Error('bad redirect'))),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      windowRef: {
        location: {
          origin: 'http://127.0.0.1:55173',
        },
      },
      createUserManager: () => oidcClient,
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: false,
      reason: 'redirect_failed',
    });
    expect(manager.getSnapshot().error).toBe('bad redirect');
  });
});

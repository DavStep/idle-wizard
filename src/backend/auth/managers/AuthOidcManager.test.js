import { describe, expect, it, vi } from 'vitest';
import { TextEncoder } from 'node:util';

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

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function createFakeJwt({
  expiresAtSeconds,
  nonce,
  audience = 'client-1',
  profile = {},
} = {}) {
  return [
    encodeBase64Url({ alg: 'none', typ: 'JWT' }),
    encodeBase64Url({
      exp: expiresAtSeconds,
      sub: 'google-sub',
      aud: audience,
      email: 'dav@example.com',
      name: 'Dav',
      nonce,
      ...profile,
    }),
    'signature',
  ].join('.');
}

describe('AuthOidcManager', () => {
  it('stays disabled without a Google client id', async () => {
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
    expect(capturedSettings.authority).toBe('https://accounts.google.com');
    expect(capturedSettings.response_type).toBe('code');
    expect(capturedSettings.prompt).toBe('select_account');
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
      authenticated: false,
      displayName: 'Dav',
      email: 'dav@example.com',
      disabledReason: null,
    });
  });

  it('keeps code flow available when explicitly configured', async () => {
    let capturedSettings = null;
    const oidcClient = {
      getUser: vi.fn(() => Promise.resolve(null)),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      responseType: 'code',
      storage: createMemoryStorage(),
      windowRef: {
        location: {
          origin: 'https://davstep.github.io',
          pathname: '/idle-wizard/',
          search: '',
          hash: '',
          href: 'https://davstep.github.io/idle-wizard/',
        },
      },
      createUserManager: (settings) => {
        capturedSettings = settings;
        return oidcClient;
      },
    });

    await manager.prepare();

    expect(capturedSettings.response_type).toBe('code');
  });

  it('normalizes legacy implicit OIDC response types to code flow', async () => {
    let capturedSettings = null;
    const oidcClient = {
      getUser: vi.fn(() => Promise.resolve(null)),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      responseType: 'id_token',
      storage: createMemoryStorage(),
      windowRef: {
        location: {
          origin: 'https://davstep.github.io',
          pathname: '/idle-wizard/',
          search: '',
          hash: '',
          href: 'https://davstep.github.io/idle-wizard/',
        },
      },
      createUserManager: (settings) => {
        capturedSettings = settings;
        return oidcClient;
      },
    });

    await manager.prepare();

    expect(capturedSettings.response_type).toBe('code');
  });

  it('uses Google Identity Services on web and stores the returned ID token', async () => {
    const storage = createMemoryStorage();
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    let capturedConfig = null;
    const google = {
      accounts: {
        id: {
          initialize: vi.fn((config) => {
            capturedConfig = config;
          }),
          prompt: vi.fn(() => {
            capturedConfig.callback({
              credential: idToken,
              select_by: 'btn',
            });
          }),
          disableAutoSelect: vi.fn(),
        },
      },
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      windowRef: {
        atob: globalThis.atob,
        document: {},
        google,
        setTimeout: vi.fn(() => 1),
        clearTimeout: vi.fn(),
      },
      createUserManager: () => {
        throw new Error('web Google Identity should not create OIDC manager');
      },
    });

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: false,
    });
    await expect(
      manager.signIn({ pendingAccountLinkAttemptId: 'attempt-1' }),
    ).resolves.toEqual({
      ok: true,
      reloadRequired: true,
    });

    expect(google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        callback: expect.any(Function),
        itp_support: true,
      }),
    );
    expect(google.accounts.id.prompt).toHaveBeenCalledTimes(1);
    expect(storage.getItem('idle-wizard.web-google.user')).toContain(idToken);
    expect(storage.getItem('idle-wizard.web-google.user')).toContain('attempt-1');
    expect(storage.getItem('idle-wizard.account-link.active-attempt')).toBeNull();
    expect(manager.getAccountLinkAttemptId()).toBe('attempt-1');
    await expect(manager.getConnectionToken()).resolves.toBe(idToken);
    expect(manager.getSnapshot()).toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });

    await expect(manager.signOut()).resolves.toEqual({ ok: true });
    expect(google.accounts.id.disableAutoSelect).toHaveBeenCalledTimes(1);
    expect(storage.getItem('idle-wizard.web-google.user')).toBeNull();
  });

  it('binds browser atob while decoding web Google ID tokens', async () => {
    const storage = createMemoryStorage();
    const originalAtob = globalThis.atob;
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    let capturedConfig = null;
    const google = {
      accounts: {
        id: {
          initialize: vi.fn((config) => {
            capturedConfig = config;
          }),
          prompt: vi.fn(() => {
            capturedConfig.callback({
              credential: idToken,
            });
          }),
        },
      },
    };
    const windowRef = {
      atob(value) {
        if (this !== windowRef) {
          throw new Error('Illegal invocation');
        }

        return originalAtob.call(globalThis, value);
      },
      document: {},
      google,
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      windowRef,
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: true,
      reloadRequired: true,
    });
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
  });

  it('falls back to redirect when web Google Identity prompt cannot display', async () => {
    const google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          prompt: vi.fn((listener) => {
            listener({
              isNotDisplayed: () => true,
              isSkippedMoment: () => false,
              getNotDisplayedReason: () => 'unregistered_origin',
            });
          }),
        },
      },
    };
    const storage = createMemoryStorage();
    const oidcClient = {
      signinRedirect: vi.fn(() => Promise.resolve()),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      windowRef: {
        document: {},
        google,
        location: {
          origin: 'https://davstep.github.io',
        },
        setTimeout: vi.fn(() => 1),
        clearTimeout: vi.fn(),
      },
      createUserManager: () => oidcClient,
    });

    await expect(
      manager.signIn({ pendingAccountLinkAttemptId: 'attempt-1' }),
    ).resolves.toEqual({ ok: true });
    expect(oidcClient.signinRedirect).toHaveBeenCalledTimes(1);
    expect(storage.getItem('idle-wizard.account-link.active-attempt')).toBe(
      'attempt-1',
    );
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: null,
      cancelled: false,
    });
  });

  it('handles redirect callback before web Google Identity mode after fallback', async () => {
    const storage = createMemoryStorage();
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    const user = {
      id_token: idToken,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
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
    storage.setItem('idle-wizard.account-link.active-attempt', 'attempt-1');
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      basePath: '/idle-wizard/',
      storage,
      windowRef: {
        atob: globalThis.atob,
        document: {
          title: 'Idle Wizard',
          createElement: vi.fn(),
        },
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

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });

    expect(oidcClient.signinCallback).toHaveBeenCalledWith(
      'https://davstep.github.io/idle-wizard/?code=abc&state=def',
    );
    expect(storage.getItem('idle-wizard.web-google.user')).toContain(idToken);
    expect(storage.getItem('idle-wizard.web-google.user')).toContain('attempt-1');
    expect(storage.getItem('idle-wizard.account-link.active-attempt')).toBeNull();
    expect(replaceState).toHaveBeenCalledWith({}, 'Idle Wizard', '/idle-wizard/');
    await expect(manager.getConnectionToken()).resolves.toBe(idToken);

    const removeUser = vi.fn(() => Promise.resolve());
    const reloadedManager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      windowRef: {
        atob: globalThis.atob,
        document: {
          createElement: vi.fn(),
        },
        location: {
          origin: 'https://davstep.github.io',
          pathname: '/idle-wizard/',
          search: '',
          hash: '',
          href: 'https://davstep.github.io/idle-wizard/',
        },
      },
      createUserManager: () => ({
        getUser: vi.fn(() => Promise.resolve(null)),
        removeUser,
      }),
    });

    await expect(reloadedManager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
    await expect(reloadedManager.getConnectionToken()).resolves.toBe(idToken);

    await expect(reloadedManager.signOut()).resolves.toEqual({ ok: true });
    expect(removeUser).toHaveBeenCalledTimes(1);
    expect(storage.getItem('idle-wizard.web-google.user')).toBeNull();
    await expect(reloadedManager.getConnectionToken()).resolves.toBeUndefined();
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

  it('can disable OIDC on native builds', async () => {
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
      nativeOidcEnabled: false,
      nativeGoogleAuthPlugin: null,
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
        throw new Error('native OIDC should be disabled');
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

  it('uses the hosted redirect and handles the Android app callback on native builds', async () => {
    let capturedSettings = null;
    let capturedRedirectNavigator = null;
    const user = {
      id_token: 'id-token',
      profile: {
        email: 'dav@example.com',
      },
    };
    const browserPlugin = {
      open: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    };
    const oidcClient = {
      signinCallback: vi.fn(() => Promise.resolve(user)),
      getUser: vi.fn(() => Promise.resolve(null)),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      mobileRedirectUri: 'https://davstep.github.io/idle-wizard/',
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
      browserPlugin,
      nativeGoogleAuthPlugin: null,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
      createUserManager: (settings, redirectNavigator) => {
        capturedSettings = settings;
        capturedRedirectNavigator = redirectNavigator;
        return oidcClient;
      },
    });

    await manager.prepare();

    expect(capturedSettings.redirect_uri).toBe(
      'https://davstep.github.io/idle-wizard/',
    );
    expect(capturedSettings.response_type).toBe('code');
    expect(oidcClient.signinCallback).toHaveBeenCalledWith(
      'com.idlewizard.game://auth/callback?code=abc&state=def',
    );
    expect(browserPlugin.close).toHaveBeenCalledTimes(1);

    const handle = await capturedRedirectNavigator.prepare();
    void handle.navigate({ url: 'https://accounts.google.com/o/oauth2/v2/auth' });
    await Promise.resolve();

    expect(browserPlugin.open).toHaveBeenCalledWith({
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      presentationStyle: 'fullscreen',
    });
    await expect(manager.getConnectionToken()).resolves.toBe('id-token');
  });

  it('uses native Google auth on native builds', async () => {
    const storage = createMemoryStorage();
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() =>
        Promise.resolve({
          idToken,
          email: 'dav@example.com',
          displayName: 'Dav',
          uniqueId: 'google-sub',
        }),
      ),
      consumePendingSignInResult: vi.fn(() => Promise.resolve({})),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
      createUserManager: () => {
        throw new Error('native Google auth should not create OIDC manager');
      },
    });

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: false,
    });
    await expect(
      manager.signIn({ pendingAccountLinkAttemptId: 'attempt-1' }),
    ).resolves.toEqual({
      ok: true,
      reloadRequired: true,
    });

    expect(nativeGoogleAuthPlugin.signIn).toHaveBeenCalledWith({
      serverClientId: 'client-1',
    });
    expect(nativeGoogleAuthPlugin.consumePendingSignInResult).toHaveBeenCalledTimes(2);
    expect(storage.getItem('idle-wizard.native-google.user')).toContain('attempt-1');
    expect(storage.getItem('idle-wizard.account-link.active-attempt')).toBeNull();
    expect(manager.getAccountLinkAttemptId()).toBe('attempt-1');
    await expect(manager.getConnectionToken()).resolves.toBe(idToken);
    expect(manager.getSnapshot()).toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
      disabledReason: null,
    });

    const reloadedManager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(reloadedManager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
    expect(reloadedManager.getAccountLinkAttemptId()).toBe('attempt-1');
    await expect(reloadedManager.getConnectionToken()).resolves.toBe(idToken);
  });

  it('uses native Google result fields when WebView token decoding fails', async () => {
    const storage = createMemoryStorage();
    const originalAtob = globalThis.atob;
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() =>
        Promise.resolve({
          idToken,
          email: 'dav@example.com',
          displayName: 'Dav',
          uniqueId: 'google-sub',
        }),
      ),
      consumePendingSignInResult: vi.fn(() => Promise.resolve({})),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    try {
      globalThis.atob = () => {
        throw new Error('decode failed');
      };

      await expect(manager.signIn()).resolves.toEqual({
        ok: true,
        reloadRequired: true,
      });
    } finally {
      globalThis.atob = originalAtob;
    }

    expect(storage.getItem('idle-wizard.native-google.user')).toContain('google-sub');
    await expect(manager.getConnectionToken()).resolves.toBe(idToken);
    expect(manager.getSnapshot()).toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
  });

  it('recovers native Google auth when Android returns after the WebView restarts', async () => {
    const storage = createMemoryStorage();
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    storage.setItem('idle-wizard.account-link.active-attempt', 'attempt-1');
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(),
      consumePendingSignInResult: vi.fn(() =>
        Promise.resolve({
          idToken,
          email: 'dav@example.com',
          displayName: 'Dav',
          uniqueId: 'google-sub',
        }),
      ),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.prepare()).resolves.toMatchObject({
      enabled: true,
      authenticated: true,
      displayName: 'Dav',
      email: 'dav@example.com',
    });

    expect(nativeGoogleAuthPlugin.signIn).not.toHaveBeenCalled();
    expect(nativeGoogleAuthPlugin.consumePendingSignInResult).toHaveBeenCalledTimes(1);
    await expect(manager.getConnectionToken()).resolves.toBe(idToken);
    expect(storage.getItem('idle-wizard.native-google.user')).toContain(idToken);
    expect(storage.getItem('idle-wizard.native-google.user')).toContain('attempt-1');
    expect(storage.getItem('idle-wizard.account-link.active-attempt')).toBeNull();
  });

  it('keeps native Google profile after the stored ID token expires', async () => {
    const storage = createMemoryStorage();
    const expiredToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) - 3600,
    });
    storage.setItem(
      'idle-wizard.native-google.user',
      JSON.stringify({
        id_token: expiredToken,
        expires_at: Date.now() - 3600_000,
        profile: {
          email: 'dav@example.com',
          name: 'Dav',
        },
      }),
    );
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin: {
        signIn: vi.fn(),
      },
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await manager.prepare();

    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      displayName: 'Dav',
      email: 'dav@example.com',
    });
    await expect(manager.getConnectionToken()).resolves.toBeUndefined();
    expect(storage.getItem('idle-wizard.native-google.user')).toBe(
      JSON.stringify({
        profile: {
          sub: '',
          email: 'dav@example.com',
          name: 'Dav',
          given_name: '',
          family_name: '',
          picture: '',
        },
      }),
    );
  });

  it('reports native Google auth failures', async () => {
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() => Promise.reject(new Error('account picker failed'))),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: false,
      reason: 'native_failed',
    });
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: 'account picker failed',
      cancelled: false,
    });
  });

  it('treats native Google auth cancellation as a neutral cancel', async () => {
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() => Promise.resolve({ cancelled: true })),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: false,
      reason: 'native_cancelled',
    });
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: null,
      cancelled: true,
    });
  });

  it('treats empty native Google auth results as a neutral cancel', async () => {
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() => Promise.resolve({})),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: false,
      reason: 'native_cancelled',
    });
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: null,
      cancelled: true,
    });
  });

  it('clears native Google auth state on sign out', async () => {
    const storage = createMemoryStorage();
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
    });
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() =>
        Promise.resolve({
          idToken,
          email: 'dav@example.com',
        }),
      ),
      signOut: vi.fn(() => Promise.resolve()),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage,
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await manager.signIn();
    expect(storage.getItem('idle-wizard.native-google.user')).not.toBeNull();
    await expect(manager.signOut()).resolves.toEqual({ ok: true });

    expect(nativeGoogleAuthPlugin.signOut).toHaveBeenCalledTimes(1);
    expect(storage.getItem('idle-wizard.native-google.user')).toBeNull();
    await expect(manager.getConnectionToken()).resolves.toBeUndefined();
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: null,
    });
  });

  it('rejects Google ID tokens without expiry', async () => {
    const idToken = createFakeJwt();
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() =>
        Promise.resolve({
          idToken,
          email: 'dav@example.com',
        }),
      ),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.signIn()).resolves.toEqual({
      ok: false,
      reason: 'native_failed',
    });
    expect(manager.getSnapshot()).toMatchObject({
      authenticated: false,
      error: 'Google login returned an expired identity token.',
    });
  });

  it('rejects native Google tokens with a mismatched nonce', async () => {
    const idToken = createFakeJwt({
      expiresAtSeconds: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'nonce-from-token',
    });
    const nativeGoogleAuthPlugin = {
      signIn: vi.fn(() =>
        Promise.resolve({
          idToken,
          nonce: 'nonce-from-request',
          email: 'dav@example.com',
        }),
      ),
    };
    const manager = new AuthOidcManager({
      clientId: 'client-1',
      storage: createMemoryStorage(),
      capacitor: {
        getPlatform: () => 'android',
      },
      nativeGoogleAuthPlugin,
      windowRef: {
        location: {
          origin: 'http://localhost',
          href: 'http://localhost/',
          search: '',
        },
      },
    });

    await expect(manager.signIn()).resolves.toMatchObject({
      ok: false,
      reason: 'native_failed',
    });
    expect(manager.getSnapshot().error).toBe(
      'Google login returned a token with an invalid nonce.',
    );
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

// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { TopPanelAuthManager } from './TopPanelAuthManager.js';

function createRefs() {
  return {
    authSection: document.createElement('section'),
    authButton: document.createElement('button'),
    authStatus: document.createElement('div'),
  };
}

describe('TopPanelAuthManager', () => {
  it('reloads after native Google sign-in requests a backend reconnect', async () => {
    const refs = createRefs();
    const reload = vi.fn();
    const authFacade = {
      subscribe: vi.fn((listener) => {
        listener({
          oidc: {
            enabled: true,
            authenticated: false,
          },
        });
        return vi.fn();
      }),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({
          ok: true,
          reloadRequired: true,
        }),
      ),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      gameplayFacade: {
        createPersistenceSave: vi.fn(() => ({ tasks: { currentLevel: 1 } })),
      },
      reload,
    });

    manager.mount(refs);
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload after web sign-in starts its own redirect', async () => {
    const refs = createRefs();
    const reload = vi.fn();
    const authFacade = {
      subscribe: vi.fn((listener) => {
        listener({
          oidc: {
            enabled: true,
            authenticated: false,
          },
        });
        return vi.fn();
      }),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({
          ok: true,
        }),
      ),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      gameplayFacade: {
        createPersistenceSave: vi.fn(() => ({ tasks: { currentLevel: 1 } })),
      },
      reload,
    });

    manager.mount(refs);
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores duplicate clicks while login is already running', async () => {
    const refs = createRefs();
    let finishLogin = null;
    const authFacade = {
      getSnapshot: vi.fn(() => ({
        oidc: {
          enabled: true,
          authenticated: false,
        },
      })),
      subscribe: vi.fn((listener) => {
        listener(authFacade.getSnapshot());
        return vi.fn();
      }),
      signInWithGoogle: vi.fn(
        () =>
          new Promise((resolve) => {
            finishLogin = () => resolve({ ok: false, reason: 'web_cancelled' });
          }),
      ),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      gameplayFacade: {
        createPersistenceSave: vi.fn(() => ({ tasks: { currentLevel: 1 } })),
      },
      reload: vi.fn(),
    });

    manager.mount(refs);
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(authFacade.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(refs.authButton.disabled).toBe(true);

    finishLogin();
    await Promise.resolve();
    await Promise.resolve();

    expect(refs.authStatus.textContent).toBe('login cancelled');
  });

  it('shows pending-save failures without starting a redirect', async () => {
    const refs = createRefs();
    const authFacade = {
      getSnapshot: vi.fn(() => ({
        oidc: {
          enabled: true,
          authenticated: false,
        },
      })),
      subscribe: vi.fn((listener) => {
        listener(authFacade.getSnapshot());
        return vi.fn();
      }),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({
          ok: false,
          reason: 'pending_save_failed',
          message: 'could not save device data',
        }),
      ),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      gameplayFacade: {
        createPersistenceSave: vi.fn(() => ({ tasks: { currentLevel: 1 } })),
      },
      reload: vi.fn(),
    });

    manager.mount(refs);
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(refs.authStatus.textContent).toBe(
      'login error: could not save device data',
    );
  });

  it('shows web-unavailable login failures as unavailable', async () => {
    const refs = createRefs();
    const authFacade = {
      getSnapshot: vi.fn(() => ({
        oidc: {
          enabled: true,
          authenticated: false,
        },
      })),
      subscribe: vi.fn((listener) => {
        listener(authFacade.getSnapshot());
        return vi.fn();
      }),
      signInWithGoogle: vi.fn(() =>
        Promise.resolve({ ok: false, reason: 'web_unavailable' }),
      ),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      gameplayFacade: {
        createPersistenceSave: vi.fn(() => ({ tasks: { currentLevel: 1 } })),
      },
      reload: vi.fn(),
    });

    manager.mount(refs);
    refs.authButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(refs.authStatus.textContent).toBe('login unavailable');
  });

  it('hides raw Google prompt failure reasons in settings', () => {
    const refs = createRefs();
    const authFacade = {
      getSnapshot: vi.fn(() => ({
        oidc: {
          enabled: true,
          authenticated: false,
          error: 'unregistered_origin',
        },
      })),
      subscribe: vi.fn((listener) => {
        listener(authFacade.getSnapshot());
        return vi.fn();
      }),
    };
    const manager = new TopPanelAuthManager({
      authFacade,
      reload: vi.fn(),
    });

    manager.mount(refs);

    expect(refs.authStatus.textContent).toBe('login unavailable');
  });
});

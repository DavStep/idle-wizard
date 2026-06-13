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
});

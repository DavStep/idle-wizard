// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthMobileRedirectBridgeManager } from './AuthMobileRedirectBridgeManager.js';

function createWindowRef({
  search = '',
  hash = '',
  href = `https://davstep.github.io/idle-wizard/${search}${hash}`,
} = {}) {
  return {
    location: {
      search,
      hash,
      href,
      replace: vi.fn(),
    },
    setTimeout: vi.fn(),
  };
}

describe('AuthMobileRedirectBridgeManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('leaves normal hosted web callbacks alone without the native marker', () => {
    const windowRef = createWindowRef({
      search: '?code=abc&state=def',
    });
    const manager = new AuthMobileRedirectBridgeManager({
      windowRef,
      documentRef: document,
      navigatorRef: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
    });

    expect(manager.redirectIfNeeded()).toBe(false);
    expect(windowRef.location.replace).not.toHaveBeenCalled();
    expect(document.querySelector('.mobile-auth-bridge')).toBeNull();
  });

  it('opens Android callbacks with an intent URL and strips the native marker', () => {
    const windowRef = createWindowRef({
      search: '?native_auth=1&code=abc&state=def',
    });
    const manager = new AuthMobileRedirectBridgeManager({
      windowRef,
      documentRef: document,
      navigatorRef: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
    });

    expect(manager.redirectIfNeeded()).toBe(true);

    expect(windowRef.location.replace).toHaveBeenCalledWith(
      expect.stringContaining(
        'intent://auth/callback?code=abc&state=def#Intent;scheme=com.idlewizard.game;package=com.idlewizard.game;',
      ),
    );
    expect(windowRef.location.replace.mock.calls[0][0]).toContain(
      'intent://auth/callback?code=abc&state=def#Intent;',
    );
    expect(windowRef.setTimeout).toHaveBeenCalledWith(expect.any(Function), 800);
    expect(document.querySelector('.mobile-auth-bridge__button')?.textContent).toBe(
      'open game',
    );
  });

  it('falls back to the custom scheme when the browser is not Android', () => {
    const windowRef = createWindowRef({
      search: '?native_auth=1&code=abc&state=def',
      userAgent: 'Mozilla/5.0 (iPhone)',
    });
    const manager = new AuthMobileRedirectBridgeManager({
      windowRef,
      documentRef: document,
      navigatorRef: { userAgent: 'Mozilla/5.0 (iPhone)' },
    });

    expect(manager.redirectIfNeeded()).toBe(true);
    expect(windowRef.location.replace).toHaveBeenCalledWith(
      'com.idlewizard.game://auth/callback?code=abc&state=def',
    );
    expect(windowRef.setTimeout).not.toHaveBeenCalled();
  });

  it('uses merged hash callback params', () => {
    const windowRef = createWindowRef({
      search: '?native_auth=1',
      hash: '#code=abc&state=def',
    });
    const manager = new AuthMobileRedirectBridgeManager({
      windowRef,
      documentRef: document,
      navigatorRef: { userAgent: 'Mozilla/5.0 (Linux; Android 15)' },
    });

    expect(manager.redirectIfNeeded()).toBe(true);
    expect(windowRef.location.replace.mock.calls[0][0]).toContain(
      'intent://auth/callback?code=abc&state=def#Intent;',
    );
  });
});

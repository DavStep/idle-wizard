import { describe, expect, it } from 'vitest';

import { AuthGoogleTokenManager } from './AuthGoogleTokenManager.js';

function createFakeJwt({ expiresAtSeconds, nonce, audience = 'client-1' } = {}) {
  const encode = (value) =>
    globalThis
      .btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/u, '');

  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      exp: expiresAtSeconds,
      sub: 'google-sub',
      aud: audience,
      nonce,
    }),
    'signature',
  ].join('.');
}

describe('AuthGoogleTokenManager', () => {
  it('decodes tokens when browser atob requires the window receiver', () => {
    const originalAtob = globalThis.atob;
    const token = createFakeJwt({
      audience: 'client-1',
      expiresAtSeconds: 4_102_444_800,
      nonce: 'nonce-1',
    });

    try {
      globalThis.atob = function atobWithBrowserReceiver(value) {
        if (this !== globalThis) {
          throw new Error('Illegal invocation');
        }

        return originalAtob.call(globalThis, value);
      };

      const manager = new AuthGoogleTokenManager({
        clientId: 'client-1',
        now: () => 1_000,
      });

      expect(manager.validateIdToken(token, { expectedNonce: 'nonce-1' })).toMatchObject({
        sub: 'google-sub',
        aud: 'client-1',
      });
    } finally {
      globalThis.atob = originalAtob;
    }
  });
});

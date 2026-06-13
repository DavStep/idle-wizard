import { describe, expect, it } from 'vitest';
import { TextEncoder } from 'node:util';

import { AuthGoogleTokenManager } from './AuthGoogleTokenManager.js';

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
      nonce,
      ...profile,
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

  it('decodes UTF-8 Google token payloads', () => {
    const token = createFakeJwt({
      audience: 'client-1',
      expiresAtSeconds: 4_102_444_800,
      profile: {
        name: 'Դավիթ',
      },
    });
    const manager = new AuthGoogleTokenManager({
      clientId: 'client-1',
      now: () => 1_000,
    });

    expect(manager.validateIdToken(token)).toMatchObject({
      sub: 'google-sub',
      name: 'Դավիթ',
    });
  });
});

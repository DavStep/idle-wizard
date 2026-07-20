import { describe, expect, it } from 'vitest';

import { createIdentityOnlyPlayerReset } from './playerIdentityReset';

describe('identity-only player reset', () => {
  it('keeps only the player identity and replaces every profile field with fresh defaults', () => {
    const identity = { toHexString: () => 'connected-google-identity' };
    const resetAt = { microsSinceUnixEpoch: 2n };
    const player = {
      identity,
      username: 'old name',
      connected: true,
      createdAt: { microsSinceUnixEpoch: 1n },
      lastSeenAt: { microsSinceUnixEpoch: 1n },
      playerLevel: 42,
      theme: 'witchcraft',
      colorMode: 'old-color-mode',
      usernamePromptSeen: true,
      font: 'comic-sans-mono',
      character: 'corvin',
    };

    expect(createIdentityOnlyPlayerReset(player, resetAt)).toEqual({
      identity,
      username: 'wizard',
      connected: false,
      createdAt: resetAt,
      lastSeenAt: resetAt,
      playerLevel: 1,
      theme: 'midnight',
      colorMode: 'resources',
      usernamePromptSeen: false,
      font: 'lexend',
      character: 'elara',
    });
  });
});

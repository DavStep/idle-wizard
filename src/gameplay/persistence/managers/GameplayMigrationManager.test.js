import { describe, expect, it } from 'vitest';

import {
  GAMEPLAY_SAVE_VERSION,
  GameplayMigrationManager,
} from './GameplayMigrationManager.js';

describe('GameplayMigrationManager', () => {
  it('migrates legacy gold saves to coin while keeping the legacy mirror', () => {
    const manager = new GameplayMigrationManager();

    expect(
      manager.migrate({
        version: 6,
        savedAt: 123,
        gold: {
          current: 12,
          totalGenerated: 34,
        },
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      savedAt: 123,
      coin: {
        current: 12,
        totalGenerated: 34,
      },
      gold: {
        current: 12,
        totalGenerated: 34,
      },
    });
  });

  it('preserves guild state when a server-normalized save still uses version 3', () => {
    const manager = new GameplayMigrationManager();
    const guild = {
      version: 1,
      profile: {
        name: 'ash hall',
        tag: 'ASH',
        color: 'red',
        createdAtMs: 123,
      },
      secretaryLevel: 2,
      adventurers: [{ id: 'adventurer:one', name: 'mira', status: 'idle' }],
      applicants: [{ id: 'applicant:two', name: 'rowan', status: 'idle' }],
      board: [{ id: 'request:one', title: 'quiet road', difficulty: 'easy' }],
      logs: [{ id: 1, message: 'guild charter signed for ash hall.' }],
    };

    expect(
      manager.migrate({
        version: 3,
        savedAt: 123,
        guild,
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      guild,
    });
  });

  it('preserves inbox reward claim keys from server-normalized saves', () => {
    const manager = new GameplayMigrationManager();
    const inboxRewards = {
      version: 1,
      claimedMailKeys: ['admin:gift:identity'],
    };

    expect(
      manager.migrate({
        version: 3,
        savedAt: 123,
        inboxRewards,
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      inboxRewards,
    });
  });
});

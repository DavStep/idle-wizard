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
});

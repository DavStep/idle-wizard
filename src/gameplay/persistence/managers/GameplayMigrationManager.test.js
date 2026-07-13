import { describe, expect, it } from 'vitest';

import {
  GAMEPLAY_SAVE_VERSION,
  GameplayMigrationManager,
} from './GameplayMigrationManager.js';
import { emeraldResearchIds } from '../../research/emeraldResearchIds.js';

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

  it('adds empty stats when migrating version 9 saves', () => {
    const manager = new GameplayMigrationManager();

    expect(
      manager.migrate({
        version: 9,
        savedAt: 123,
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      stats: {
        version: 1,
        seeds: { total: 0, byKey: {} },
        herbs: { total: 0, byKey: {} },
        potions: { total: 0, byKey: {} },
        coin: {
          npcTrade: 0,
          playerTrade: 0,
          royalties: { total: 0, byPotionKey: {} },
        },
        recordedPlayerTradeIds: [],
        recordedRoyaltyIds: [],
      },
    });
  });

  it('keeps the amount already paid for legacy multiplier research', () => {
    const manager = new GameplayMigrationManager();
    const plotMultiplier = emeraldResearchIds.plotPlanting(1, 3);
    const cauldronMultiplier = emeraldResearchIds.cauldronBrewing(2, 5);

    expect(
      manager.migrate({
        version: 10,
        research: {
          completedIds: [plotMultiplier],
          inProgress: [
            {
              researchId: cauldronMultiplier,
              totalSeconds: 30,
              remainingSeconds: 12,
            },
          ],
        },
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      research: {
        crystalCostById: {
          [plotMultiplier]: 2,
          [cauldronMultiplier]: 4,
        },
      },
    });
  });

  it('preserves stats from server-normalized saves', () => {
    const manager = new GameplayMigrationManager();
    const stats = {
      version: 1,
      seeds: { total: 3, byKey: { sageSeed: 3 } },
      coin: { playerTrade: 5 },
    };

    expect(
      manager.migrate({
        version: 3,
        savedAt: 123,
        stats,
      }),
    ).toMatchObject({
      version: GAMEPLAY_SAVE_VERSION,
      stats,
    });
  });
});

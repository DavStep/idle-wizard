import { describe, expect, it, vi } from 'vitest';

import { PlayerInfoSubscriptionManager } from './PlayerInfoSubscriptionManager.js';

function createTable(rows) {
  const callbacks = {
    insert: null,
    update: null,
    delete: null,
  };

  return {
    iter: () => rows.values(),
    onInsert: (callback) => {
      callbacks.insert = callback;
    },
    onUpdate: (callback) => {
      callbacks.update = callback;
    },
    onDelete: (callback) => {
      callbacks.delete = callback;
    },
    removeOnInsert: (callback) => {
      if (callbacks.insert === callback) {
        callbacks.insert = null;
      }
    },
    removeOnUpdate: (callback) => {
      if (callbacks.update === callback) {
        callbacks.update = null;
      }
    },
    removeOnDelete: (callback) => {
      if (callbacks.delete === callback) {
        callbacks.delete = null;
      }
    },
    callbacks,
  };
}

function createConnection(table) {
  const subscription = {
    isEnded: () => false,
    unsubscribe: vi.fn(),
  };

  return {
    db: {
      playerInfoSummary: table,
    },
    subscription,
    subscriptionBuilder: () => ({
      onApplied(callback) {
        this.applied = callback;
        return this;
      },
      onError(callback) {
        this.error = callback;
        return this;
      },
      subscribe(query) {
        subscription.query = query;
        this.applied();
        return subscription;
      },
    }),
  };
}

describe('PlayerInfoSubscriptionManager', () => {
  it('publishes compact player info rows', () => {
    const rows = [
      {
        identity: { toHexString: () => 'identity-ada' },
        username: 'Ada',
        character: 'mira',
        frame: 'emerald',
        allianceTag: 'tap',
        allianceTagColor: 'red',
        totalProducedCoin: 1234n,
        totalBrewedPotions: 86n,
        totalHarvestedHerbs: 240n,
        playerLevel: 14,
        prestigeCount: 2,
        connected: false,
        lastSeenAt: { microsSinceUnixEpoch: 1_690_000_000_000_000n },
        totalPlayTimeSeconds: 45_000n,
        updatedAt: { microsSinceUnixEpoch: 1_700_000n },
      },
    ];
    const table = createTable(rows);
    const connection = createConnection(table);
    const manager = new PlayerInfoSubscriptionManager();

    manager.connect(connection);

    expect(connection.subscription.query).toBe('SELECT * FROM player_info_summary');
    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      players: [
        {
          identity: 'identity-ada',
          username: 'Ada',
          character: 'mira',
          frame: 'emerald',
          allianceTag: 'TAP',
          totalProducedCoin: 1234,
          totalBrewedPotions: 86,
          totalHarvestedHerbs: 240,
          playerLevel: 14,
          prestigeCount: 2,
          connected: false,
          lastSeenAtMs: 1_690_000_000_000,
          totalPlayTimeSeconds: 45_000,
          updatedAtMs: 1700,
        },
      ],
    });
  });
});

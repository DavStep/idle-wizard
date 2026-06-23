import { describe, expect, it, vi } from 'vitest';

import { WorldEventLeaderboardSubscriptionManager } from './WorldEventLeaderboardSubscriptionManager.js';

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
      worldEventLeaderboardSummary: table,
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
        this.query = query;
        subscription.query = query;
        this.applied();
        return subscription;
      },
    }),
  };
}

function createGameplayFacade({ periodKey = 'weekly-1', eventId = 'fever-lower-quarter' } = {}) {
  return {
    getSnapshot: () => ({
      worldNotice: {
        current: {
          periodKey,
          eventId,
        },
      },
    }),
    subscribe: vi.fn(() => vi.fn()),
  };
}

describe('WorldEventLeaderboardSubscriptionManager', () => {
  it('publishes shared event users for the active event', () => {
    const rows = [
      {
        identity: 'low',
        periodKey: 'weekly-1',
        eventId: 'fever-lower-quarter',
        username: 'Low',
        playerLevel: 2,
        character: 'mira',
        points: 25n,
        rank: 2,
      },
      {
        identity: 'high',
        periodKey: 'weekly-1',
        eventId: 'fever-lower-quarter',
        username: 'High',
        allianceTag: 'TOP',
        playerLevel: 5,
        character: 'rowan',
        points: 125n,
        rank: 1,
      },
      {
        identity: 'other',
        periodKey: 'weekly-1',
        eventId: 'siege-stonebridge',
        username: 'Other',
        playerLevel: 3,
        points: 500n,
        rank: 1,
      },
    ];
    const table = createTable(rows);
    const connection = createConnection(table);
    const manager = new WorldEventLeaderboardSubscriptionManager();

    manager.setGameplayFacade(createGameplayFacade());
    manager.connect(connection, 'low');

    expect(connection.subscription.query).toBe('SELECT * FROM world_event_leaderboard_summary');
    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      periodKey: 'weekly-1',
      eventId: 'fever-lower-quarter',
      topWorldEventUsers: [
        {
          identity: 'high',
          name: 'High',
          allianceTag: 'TOP',
          playerLevel: 5,
          character: 'rowan',
          points: 125,
          rank: 1,
        },
        {
          identity: 'low',
          name: 'Low',
          playerLevel: 2,
          character: 'mira',
          points: 25,
          rank: 2,
        },
      ],
      currentWorldEventUser: {
        identity: 'low',
        name: 'Low',
        points: 25,
        rank: 2,
      },
    });
  });
});

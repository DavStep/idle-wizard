import { describe, expect, it, vi } from 'vitest';

import { LeaderboardSubscriptionManager } from './LeaderboardSubscriptionManager.js';

function createLeaderboardTable(rows) {
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
      leaderboard: table,
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
        this.applied();
        return subscription;
      },
    }),
  };
}

describe('LeaderboardSubscriptionManager', () => {
  it('publishes top users sorted by leaderboard metric', () => {
    const snapshots = [];
    const rows = [
      { username: 'Low', playerLevel: 2, income: 20n, totalIncome: 3n },
      { username: 'High', playerLevel: 10, income: 1n, totalIncome: 12n },
    ];
    const table = createLeaderboardTable(rows);
    const connection = createConnection(table);
    const manager = new LeaderboardSubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(connection);

    expect(manager.getSnapshot()).toEqual({
      topUsers: [
        { name: 'High', playerLevel: 10, income: 1, totalGeneratedGold: 12, totalIncome: 12 },
        { name: 'Low', playerLevel: 2, income: 20, totalGeneratedGold: 3, totalIncome: 3 },
      ],
      topGeneratedGoldUsers: [
        { name: 'High', playerLevel: 10, income: 1, totalGeneratedGold: 12, totalIncome: 12 },
        { name: 'Low', playerLevel: 2, income: 20, totalGeneratedGold: 3, totalIncome: 3 },
      ],
      topIncomeUsers: [
        { name: 'Low', playerLevel: 2, income: 20, totalGeneratedGold: 3, totalIncome: 3 },
        { name: 'High', playerLevel: 10, income: 1, totalGeneratedGold: 12, totalIncome: 12 },
      ],
      currentGeneratedGoldUser: null,
      currentIncomeUser: null,
    });
    expect(snapshots.at(-1)).toEqual(manager.getSnapshot());
  });

  it('uses canonical totalIncome when legacy generated-gold rows are zero', () => {
    const rows = [
      { username: 'Low', playerLevel: 2, income: 0n, totalGeneratedGold: 0n, totalIncome: 3n },
      { username: 'High', playerLevel: 10, income: 0n, totalGeneratedGold: 0n, totalIncome: 12n },
    ];
    const manager = new LeaderboardSubscriptionManager();

    manager.connect(createConnection(createLeaderboardTable(rows)));

    expect(manager.getSnapshot().topGeneratedGoldUsers).toEqual([
      { name: 'High', playerLevel: 10, income: 0, totalGeneratedGold: 12, totalIncome: 12 },
      { name: 'Low', playerLevel: 2, income: 0, totalGeneratedGold: 3, totalIncome: 3 },
    ]);
  });

  it('publishes the connected player rank when they are outside a top list', () => {
    const rows = Array.from({ length: 11 }, (_value, index) => ({
      identity: `other-${index + 1}`,
      username: `Other ${index + 1}`,
      playerLevel: 1,
      income: BigInt(index),
      totalIncome: BigInt(100 - index),
    }));
    rows.push({
      identity: { toHexString: () => 'mine' },
      username: 'Mine',
      playerLevel: 4,
      income: 50n,
      totalIncome: 1n,
    });
    const manager = new LeaderboardSubscriptionManager();

    manager.connect(createConnection(createLeaderboardTable(rows)), 'mine');

    expect(manager.getSnapshot().topGeneratedGoldUsers).toHaveLength(10);
    expect(manager.getSnapshot().currentGeneratedGoldUser).toEqual({
      name: 'Mine',
      playerLevel: 4,
      income: 50,
      totalGeneratedGold: 1,
      totalIncome: 1,
      rank: 12,
    });
    expect(manager.getSnapshot().currentIncomeUser).toEqual({
      name: 'Mine',
      playerLevel: 4,
      income: 50,
      totalGeneratedGold: 1,
      totalIncome: 1,
      rank: 1,
    });
  });

  it('falls back to level 1 when older rows do not have a player level', () => {
    const table = createLeaderboardTable([{ username: 'Mage', totalIncome: 1n }]);
    const manager = new LeaderboardSubscriptionManager();

    manager.connect(createConnection(table));

    expect(manager.getSnapshot().topUsers[0]).toMatchObject({
      name: 'Mage',
      playerLevel: 1,
    });
  });

  it('unsubscribes and clears snapshot on disconnect', () => {
    const table = createLeaderboardTable([{ username: 'Mage', totalIncome: 1n }]);
    const connection = createConnection(table);
    const manager = new LeaderboardSubscriptionManager();

    manager.connect(connection);
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      topUsers: [],
      topGeneratedGoldUsers: [],
      topIncomeUsers: [],
      currentGeneratedGoldUser: null,
      currentIncomeUser: null,
    });
  });
});

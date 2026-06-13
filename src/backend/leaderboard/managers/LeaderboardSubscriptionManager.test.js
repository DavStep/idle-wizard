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
      leaderboardSummary: table,
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

describe('LeaderboardSubscriptionManager', () => {
  it('publishes top users sorted by leaderboard metric', () => {
    const snapshots = [];
    const rows = [
      {
        username: 'Low',
        playerLevel: 2,
        income: 20n,
        dailyIncome: 9n,
        weeklyIncome: 2n,
        monthlyIncome: 1n,
        totalIncome: 3n,
      },
      {
        username: 'High',
        playerLevel: 10,
        income: 1n,
        dailyIncome: 1n,
        weeklyIncome: 10n,
        monthlyIncome: 4n,
        totalIncome: 12n,
      },
    ];
    const table = createLeaderboardTable(rows);
    const connection = createConnection(table);
    const manager = new LeaderboardSubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(connection);

    expect(connection.subscription.query).toBe('SELECT * FROM leaderboard_summary');
    expect(manager.getSnapshot()).toMatchObject({
      topUsers: [
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
      ],
      topGeneratedGoldUsers: [
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
      ],
      topIncomeUsers: [
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
      ],
      topDailyUsers: [
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
      ],
      topWeeklyUsers: [
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
      ],
      topMonthlyUsers: [
        {
          name: 'High',
          playerLevel: 10,
          income: 1,
          dailyIncome: 1,
          weeklyIncome: 10,
          monthlyIncome: 4,
          totalGeneratedGold: 12,
          totalIncome: 12,
        },
        {
          name: 'Low',
          playerLevel: 2,
          income: 20,
          dailyIncome: 9,
          weeklyIncome: 2,
          monthlyIncome: 1,
          totalGeneratedGold: 3,
          totalIncome: 3,
        },
      ],
      currentGeneratedGoldUser: null,
      currentIncomeUser: null,
      currentDailyUser: null,
      currentWeeklyUser: null,
      currentMonthlyUser: null,
      currentAllTimeUser: null,
    });
    expect(manager.getSnapshot().topAllTimeUsers).toEqual(
      manager.getSnapshot().topGeneratedGoldUsers,
    );
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
      {
        name: 'High',
        playerLevel: 10,
        income: 0,
        dailyIncome: 0,
        weeklyIncome: 0,
        monthlyIncome: 0,
        totalGeneratedGold: 12,
        totalIncome: 12,
      },
      {
        name: 'Low',
        playerLevel: 2,
        income: 0,
        dailyIncome: 0,
        weeklyIncome: 0,
        monthlyIncome: 0,
        totalGeneratedGold: 3,
        totalIncome: 3,
      },
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
      dailyIncome: 0,
      weeklyIncome: 0,
      monthlyIncome: 0,
      totalGeneratedGold: 1,
      totalIncome: 1,
      rank: 12,
    });
    expect(manager.getSnapshot().currentIncomeUser).toEqual({
      name: 'Mine',
      playerLevel: 4,
      income: 50,
      dailyIncome: 0,
      weeklyIncome: 0,
      monthlyIncome: 0,
      totalGeneratedGold: 1,
      totalIncome: 1,
      rank: 1,
    });
  });

  it('uses server ranks when the subscribed summary only includes top rows and the player row', () => {
    const rows = Array.from({ length: 10 }, (_value, index) => ({
      identity: `top-${index + 1}`,
      username: `Top ${index + 1}`,
      playerLevel: 1,
      income: BigInt(1000 - index),
      dailyIncome: BigInt(500 - index),
      weeklyIncome: BigInt(700 - index),
      monthlyIncome: BigInt(900 - index),
      totalIncome: BigInt(1000 - index),
      dailyRank: index + 1,
      weeklyRank: index + 1,
      monthlyRank: index + 1,
      allTimeRank: index + 1,
    }));
    rows.push({
      identity: { toHexString: () => 'mine' },
      username: 'Mine',
      playerLevel: 4,
      income: 5n,
      dailyIncome: 4n,
      weeklyIncome: 3n,
      monthlyIncome: 2n,
      totalIncome: 1n,
      dailyRank: 22,
      weeklyRank: 23,
      monthlyRank: 24,
      allTimeRank: 25,
    });
    const manager = new LeaderboardSubscriptionManager();

    manager.connect(createConnection(createLeaderboardTable(rows)), 'mine');

    expect(manager.getSnapshot().topGeneratedGoldUsers).toHaveLength(10);
    expect(manager.getSnapshot().currentGeneratedGoldUser).toMatchObject({ name: 'Mine', rank: 25 });
    expect(manager.getSnapshot().currentIncomeUser).toMatchObject({ name: 'Mine', rank: 25 });
    expect(manager.getSnapshot().currentDailyUser).toMatchObject({ name: 'Mine', rank: 22 });
    expect(manager.getSnapshot().currentWeeklyUser).toMatchObject({ name: 'Mine', rank: 23 });
    expect(manager.getSnapshot().currentMonthlyUser).toMatchObject({ name: 'Mine', rank: 24 });
    expect(manager.getSnapshot().currentAllTimeUser).toMatchObject({ name: 'Mine', rank: 25 });
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
      topDailyUsers: [],
      topWeeklyUsers: [],
      topMonthlyUsers: [],
      topAllTimeUsers: [],
      currentGeneratedGoldUser: null,
      currentIncomeUser: null,
      currentDailyUser: null,
      currentWeeklyUser: null,
      currentMonthlyUser: null,
      currentAllTimeUser: null,
    });
  });
});

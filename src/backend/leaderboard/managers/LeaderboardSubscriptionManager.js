const TOP_USER_LIMIT = 10;
const EMPTY_SNAPSHOT = {
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
};

const LEADERBOARD_PERIOD_METRICS = [
  ['Daily', 'dailyIncome'],
  ['Weekly', 'weeklyIncome'],
  ['Monthly', 'monthlyIncome'],
  ['AllTime', 'totalIncome'],
];

export class LeaderboardSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identity = null;
    this.identityKey = '';
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identity = identity;
    this.identityKey = this.toIdentityKey(identity);
    this.table = connection?.db?.leaderboard ?? null;

    if (!this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.table.onInsert?.(this.handleTableChange);
    this.table.onUpdate?.(this.handleTableChange);
    this.table.onDelete?.(this.handleTableChange);

    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe('SELECT * FROM leaderboard');
    this.publishFromTable();
  }

  disconnect() {
    if (this.table) {
      this.table.removeOnInsert?.(this.handleTableChange);
      this.table.removeOnUpdate?.(this.handleTableChange);
      this.table.removeOnDelete?.(this.handleTableChange);
    }

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    this.connection = null;
    this.identity = null;
    this.identityKey = '';
    this.table = null;
    this.subscription = null;
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const users = Array.from(this.table.iter())
      .map((row) => ({
        identity: this.toIdentityKey(row.identity),
        name: row.username,
        playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
        income: this.toNumber(row.income),
        dailyIncome: this.toNumber(row.dailyIncome ?? row.daily_income),
        weeklyIncome: this.toNumber(row.weeklyIncome ?? row.weekly_income),
        monthlyIncome: this.toNumber(row.monthlyIncome ?? row.monthly_income),
        totalGeneratedGold: this.toNumber(row.totalIncome ?? row.totalGeneratedGold),
        totalIncome: this.toNumber(row.totalIncome ?? row.totalGeneratedGold),
      }));
    const rankedGeneratedGoldUsers = this.getRankedUsersBy(users, 'totalGeneratedGold');
    const rankedIncomeUsers = this.getRankedUsersBy(users, 'income');
    const topGeneratedGoldUsers = rankedGeneratedGoldUsers
      .slice(0, TOP_USER_LIMIT)
      .map((user) => this.toSnapshotUser(user));
    const topIncomeUsers = rankedIncomeUsers
      .slice(0, TOP_USER_LIMIT)
      .map((user) => this.toSnapshotUser(user));
    const periodLists = {};

    for (const [label, valueKey] of LEADERBOARD_PERIOD_METRICS) {
      const rankedUsers = this.getRankedUsersBy(users, valueKey);
      periodLists[`top${label}Users`] = rankedUsers
        .slice(0, TOP_USER_LIMIT)
        .map((user) => this.toSnapshotUser(user));
      periodLists[`current${label}User`] = this.getCurrentUser(rankedUsers);
    }

    this.publish({
      topUsers: topGeneratedGoldUsers,
      topGeneratedGoldUsers,
      topIncomeUsers,
      ...periodLists,
      currentGeneratedGoldUser: this.getCurrentUser(rankedGeneratedGoldUsers),
      currentIncomeUser: this.getCurrentUser(rankedIncomeUsers),
    });
  }

  getRankedUsersBy(users, key) {
    return [...users]
      .sort((left, right) => right[key] - left[key])
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
  }

  getCurrentUser(rankedUsers) {
    if (!this.identityKey) {
      return null;
    }

    const user = rankedUsers.find((candidate) => candidate.identity === this.identityKey);

    return user ? this.toSnapshotUser(user, { includeRank: true }) : null;
  }

  toSnapshotUser(user, { includeRank = false } = {}) {
    const snapshotUser = {
      name: user.name,
      playerLevel: user.playerLevel,
      income: user.income,
      dailyIncome: user.dailyIncome,
      weeklyIncome: user.weeklyIncome,
      monthlyIncome: user.monthlyIncome,
      totalGeneratedGold: user.totalGeneratedGold,
      totalIncome: user.totalIncome,
    };

    if (includeRank) {
      snapshotUser.rank = user.rank;
    }

    return snapshotUser;
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number.isFinite(value) ? value : 0;
  }

  toPlayerLevel(value, fallback = 1) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const playerLevel = this.toNumber(value);

    if (!Number.isFinite(playerLevel) || playerLevel < 1) {
      return fallback;
    }

    return Math.floor(playerLevel);
  }

  toIdentityKey(identity) {
    if (!identity) {
      return '';
    }

    if (typeof identity === 'string') {
      return identity;
    }

    if (typeof identity.toHexString === 'function') {
      return identity.toHexString();
    }

    return String(identity);
  }
}

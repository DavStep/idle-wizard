const TOP_USER_LIMIT = 10;
const EMPTY_SNAPSHOT = {
  topUsers: [],
  topGeneratedGoldUsers: [],
  topIncomeUsers: [],
};

export class LeaderboardSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
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
        name: row.username,
        income: this.toNumber(row.income),
        totalGeneratedGold: this.toNumber(row.totalGeneratedGold ?? row.totalIncome),
        totalIncome: this.toNumber(row.totalIncome ?? row.totalGeneratedGold),
      }));
    const topGeneratedGoldUsers = this.getTopUsersBy(users, 'totalGeneratedGold');
    const topIncomeUsers = this.getTopUsersBy(users, 'income');

    this.publish({
      topUsers: topGeneratedGoldUsers,
      topGeneratedGoldUsers,
      topIncomeUsers,
    });
  }

  getTopUsersBy(users, key) {
    return [...users].sort((left, right) => right[key] - left[key]).slice(0, TOP_USER_LIMIT);
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
}

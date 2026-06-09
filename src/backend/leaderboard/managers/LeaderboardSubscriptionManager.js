const TOP_USER_LIMIT = 10;

export class LeaderboardSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { topUsers: [] };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.table = connection?.db?.leaderboard ?? null;

    if (!this.table) {
      this.publish({ topUsers: [] });
      return;
    }

    this.table.onInsert?.(this.handleTableChange);
    this.table.onUpdate?.(this.handleTableChange);
    this.table.onDelete?.(this.handleTableChange);

    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ topUsers: [] }))
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
    this.publish({ topUsers: [] });
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table) {
      this.publish({ topUsers: [] });
      return;
    }

    const topUsers = Array.from(this.table.iter())
      .map((row) => ({
        name: row.username,
        totalIncome: this.toNumber(row.totalIncome),
      }))
      .sort((left, right) => right.totalIncome - left.totalIncome)
      .slice(0, TOP_USER_LIMIT);

    this.publish({ topUsers });
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

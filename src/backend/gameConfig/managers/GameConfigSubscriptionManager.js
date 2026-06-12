const RESEARCH_CONFIG_QUERY = 'SELECT * FROM research_config';
const GAME_CONFIG_QUERY = 'SELECT * FROM game_config';
const EMPTY_SNAPSHOT = {
  connected: false,
  researchConfigs: [],
  gameConfigs: [],
};

export class GameConfigSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.researchConfigTable = null;
    this.gameConfigTable = null;
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.researchConfigTable =
      connection?.db?.researchConfig ?? connection?.db?.research_config ?? null;
    this.gameConfigTable = connection?.db?.gameConfig ?? connection?.db?.game_config ?? null;

    if (!this.researchConfigTable && !this.gameConfigTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.researchConfigTable);
    this.bindTable(this.gameConfigTable);
    this.subscriptions = [
      this.researchConfigTable ? this.subscribeQuery(RESEARCH_CONFIG_QUERY) : null,
      this.gameConfigTable ? this.subscribeQuery(GAME_CONFIG_QUERY) : null,
    ].filter(Boolean);
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.researchConfigTable);
    this.unbindTable(this.gameConfigTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.researchConfigTable = null;
    this.gameConfigTable = null;
    this.subscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  bindTable(table) {
    table?.onInsert?.(this.handleTableChange);
    table?.onUpdate?.(this.handleTableChange);
    table?.onDelete?.(this.handleTableChange);
  }

  unbindTable(table) {
    table?.removeOnInsert?.(this.handleTableChange);
    table?.removeOnUpdate?.(this.handleTableChange);
    table?.removeOnDelete?.(this.handleTableChange);
  }

  subscribeQuery(query) {
    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(query);
  }

  publishFromTables() {
    if (!this.researchConfigTable && !this.gameConfigTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const researchConfigs = Array.from(this.researchConfigTable?.iter?.() ?? [])
      .map((row) => this.mapResearchConfig(row))
      .sort((left, right) => {
        const groupCompare = left.groupId.localeCompare(right.groupId);
        return groupCompare || left.label.localeCompare(right.label);
      });
    const gameConfigs = Array.from(this.gameConfigTable?.iter?.() ?? [])
      .map((row) => this.mapGameConfig(row))
      .sort((left, right) => left.configKey.localeCompare(right.configKey));

    this.publish({
      connected: true,
      researchConfigs,
      gameConfigs,
    });
  }

  mapResearchConfig(row) {
    return {
      researchId: String(row.researchId ?? row.research_id ?? ''),
      label: String(row.label ?? ''),
      groupId: String(row.groupId ?? row.group_id ?? ''),
      defaultCostGold: this.toNumber(row.defaultCostGold ?? row.default_cost_gold),
      costGold: this.toNumber(row.costGold ?? row.cost_gold),
      durationSeconds: this.toNumber(row.durationSeconds ?? row.duration_seconds),
      enabled: row.enabled !== false,
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  mapGameConfig(row) {
    return {
      configKey: String(row.configKey ?? row.config_key ?? ''),
      configJson: String(row.configJson ?? row.config_json ?? ''),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  toTimestampMs(value) {
    if (!value) {
      return 0;
    }

    if (typeof value.toMillis === 'function') {
      return Number(value.toMillis());
    }

    if (typeof value.microsSinceUnixEpoch === 'bigint') {
      return Number(value.microsSinceUnixEpoch / 1000n);
    }

    if (typeof value.__timestamp_micros_since_unix_epoch__ === 'bigint') {
      return Number(value.__timestamp_micros_since_unix_epoch__ / 1000n);
    }

    return Number.isFinite(value) ? value : 0;
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number.isFinite(value) ? Number(value) : 0;
  }
}

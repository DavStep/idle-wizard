const RESEARCH_CONFIG_QUERY = 'SELECT * FROM research_config_snapshot';
const GAME_CONFIG_QUERY = 'SELECT * FROM game_config_snapshot';
const LEGACY_RESEARCH_CONFIG_QUERY = 'SELECT * FROM research_config';
const LEGACY_GAME_CONFIG_QUERY = 'SELECT * FROM game_config';
const MAINTENANCE_CONFIG_KEY = 'maintenance';
const MAINTENANCE_QUERY = `SELECT * FROM game_config WHERE "configKey" = '${MAINTENANCE_CONFIG_KEY}'`;
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
    this.maintenanceTable = null;
    this.bootstrapResearchConfigs = [];
    this.bootstrapGameConfigs = [];
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    const researchConfigSource = this.findBootstrapSource({
      camelName: 'researchConfigSnapshot',
      snakeName: 'research_config_snapshot',
      query: RESEARCH_CONFIG_QUERY,
      fallbackCamelName: 'researchConfig',
      fallbackSnakeName: 'research_config',
      legacyQuery: LEGACY_RESEARCH_CONFIG_QUERY,
    });
    const gameConfigSource = this.findBootstrapSource({
      camelName: 'gameConfigSnapshot',
      snakeName: 'game_config_snapshot',
      query: GAME_CONFIG_QUERY,
      fallbackCamelName: 'gameConfig',
      fallbackSnakeName: 'game_config',
      legacyQuery: LEGACY_GAME_CONFIG_QUERY,
    });
    const maintenanceSource = this.findLiveTableSource({
      preferredCamelName: 'gameConfig',
      preferredSnakeName: 'game_config',
      fallbackCamelName: 'gameConfigSnapshot',
      fallbackSnakeName: 'game_config_snapshot',
      query: MAINTENANCE_QUERY,
    });

    this.researchConfigTable = researchConfigSource.table;
    this.gameConfigTable = gameConfigSource.table;
    this.maintenanceTable = maintenanceSource.table;

    if (!this.researchConfigTable && !this.gameConfigTable && !this.maintenanceTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.subscriptions = [
      this.researchConfigTable
        ? this.subscribeBootstrapQuery(researchConfigSource.query, () => {
            this.bootstrapResearchConfigs = this.readResearchConfigs(this.researchConfigTable);
            this.publishFromTables();
          })
        : null,
      this.gameConfigTable
        ? this.subscribeBootstrapQuery(gameConfigSource.query, () => {
            this.bootstrapGameConfigs = this.readGameConfigs(this.gameConfigTable);
            this.publishFromTables();
          })
        : null,
      this.maintenanceTable
        ? this.subscribeLiveQuery(maintenanceSource.query, () => this.publishFromTables())
        : null,
    ].filter(Boolean);
    this.bindTable(this.maintenanceTable);
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.maintenanceTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.researchConfigTable = null;
    this.gameConfigTable = null;
    this.maintenanceTable = null;
    this.bootstrapResearchConfigs = [];
    this.bootstrapGameConfigs = [];
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

  findBootstrapSource({
    camelName,
    snakeName,
    query,
    fallbackCamelName,
    fallbackSnakeName,
    legacyQuery,
  }) {
    const table = this.connection?.db?.[camelName] ?? this.connection?.db?.[snakeName] ?? null;
    if (table) {
      return { table, query };
    }

    return {
      table:
        this.connection?.db?.[fallbackCamelName] ??
        this.connection?.db?.[fallbackSnakeName] ??
        null,
      query: legacyQuery,
    };
  }

  findLiveTableSource({
    preferredCamelName,
    preferredSnakeName,
    fallbackCamelName,
    fallbackSnakeName,
    query,
  }) {
    return {
      table:
        this.connection?.db?.[preferredCamelName] ??
        this.connection?.db?.[preferredSnakeName] ??
        this.connection?.db?.[fallbackCamelName] ??
        this.connection?.db?.[fallbackSnakeName] ??
        null,
      query,
    };
  }

  subscribeBootstrapQuery(query, onApplied) {
    if (!query) {
      return null;
    }

    let subscription = null;
    let applied = false;

    subscription = this.connection
      ?.subscriptionBuilder()
      .onApplied(() => {
        applied = true;
        onApplied?.();
        if (!subscription?.isEnded?.()) {
          subscription?.unsubscribe?.();
        }
      })
      .onError(() => this.publishFromTables())
      .subscribe(query);

    if (applied && !subscription?.isEnded?.()) {
      subscription?.unsubscribe?.();
    }

    return subscription;
  }

  subscribeLiveQuery(query, onApplied) {
    if (!query) {
      return null;
    }

    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => onApplied?.())
      .onError(() => this.publishFromTables())
      .subscribe(query);
  }

  publishFromTables() {
    if (
      this.bootstrapResearchConfigs.length <= 0 &&
      this.bootstrapGameConfigs.length <= 0 &&
      !this.maintenanceTable
    ) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const maintenanceRow = this.readFirstRow(this.maintenanceTable);
    const gameConfigs = this.mergeMaintenanceGameConfig(maintenanceRow);

    this.publish({
      connected: true,
      researchConfigs: this.bootstrapResearchConfigs,
      gameConfigs,
    });
  }

  readResearchConfigs(table) {
    return Array.from(table?.iter?.() ?? [])
      .map((row) => this.mapResearchConfig(row))
      .sort((left, right) => {
        const groupCompare = left.groupId.localeCompare(right.groupId);
        return groupCompare || left.label.localeCompare(right.label);
      });
  }

  readGameConfigs(table) {
    return Array.from(table?.iter?.() ?? [])
      .map((row) => this.mapGameConfig(row))
      .sort((left, right) => left.configKey.localeCompare(right.configKey));
  }

  readFirstRow(table) {
    for (const row of table?.iter?.() ?? []) {
      return row;
    }

    return null;
  }

  mergeMaintenanceGameConfig(maintenanceRow) {
    const baseConfigs = this.bootstrapGameConfigs.filter(
      (config) => config.configKey !== MAINTENANCE_CONFIG_KEY,
    );
    const mappedMaintenance = maintenanceRow ? this.mapGameConfig(maintenanceRow) : null;

    return [...baseConfigs, ...(mappedMaintenance ? [mappedMaintenance] : [])].sort(
      (left, right) => left.configKey.localeCompare(right.configKey),
    );
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

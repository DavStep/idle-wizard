const DISCOVERIES_QUERY = 'SELECT * FROM potion_recipe_discovery_snapshot';
const LEGACY_DISCOVERIES_QUERY = 'SELECT * FROM potion_recipe_discovery';
const EMPTY_SNAPSHOT = {
  connected: false,
  discoveries: [],
};

export class PotionDiscoverySubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.discoveriesByPotionKey = new Map();
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.table = this.findTable(connection);

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
      .subscribe(this.getQuery());
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

  getDiscovery(potionKey) {
    return this.discoveriesByPotionKey.get(potionKey) ?? null;
  }

  hasDiscoveredPotion(potionKey) {
    return this.discoveriesByPotionKey.has(potionKey);
  }

  publishFromTable() {
    if (!this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const discoveries = Array.from(this.table.iter())
      .map((row) => this.mapRow(row))
      .filter((discovery) => discovery.potionKey)
      .sort((left, right) => {
        if (left.discoveredAtMs !== right.discoveredAtMs) {
          return left.discoveredAtMs - right.discoveredAtMs;
        }

        return left.potionKey.localeCompare(right.potionKey);
      });

    this.publish({
      connected: true,
      discoveries,
    });
  }

  mapRow(row) {
    return {
      potionKey: String(row.potionKey ?? row.potion_key ?? ''),
      potionLabel: String(row.potionLabel ?? row.potion_label ?? ''),
      discoveredByIdentity: this.toIdentityKey(
        row.discoveredByIdentity ?? row.discovered_by_identity,
      ),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      discoveredAtMs: this.toTimestampMs(row.discoveredAt ?? row.discovered_at),
      royaltyGold: this.toGoldValue(
        row.royaltyGold ?? row.royalty_gold,
        row.royaltyGoldScale ?? row.royalty_gold_scale,
      ),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.discoveriesByPotionKey = new Map(
      snapshot.discoveries.map((discovery) => [discovery.potionKey, discovery]),
    );
    this.onSnapshot?.(snapshot);
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

  toGoldValue(value, scaleValue = 1) {
    const numericValue = typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
    const numericScale =
      typeof scaleValue === 'bigint' ? Number(scaleValue) : Number(scaleValue ?? 1);
    const scale = numericScale > 0 ? numericScale : 1;

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return 0;
    }

    return Math.round((numericValue / scale + Number.EPSILON) * 100) / 100;
  }

  findTable(connection) {
    return (
      connection?.db?.potionRecipeDiscoverySnapshot ??
      connection?.db?.potion_recipe_discovery_snapshot ??
      connection?.db?.potionRecipeDiscovery ??
      connection?.db?.potion_recipe_discovery ??
      null
    );
  }

  getQuery() {
    return (
      this.connection?.db?.potionRecipeDiscoverySnapshot ||
      this.connection?.db?.potion_recipe_discovery_snapshot
    )
      ? DISCOVERIES_QUERY
      : LEGACY_DISCOVERIES_QUERY;
  }
}

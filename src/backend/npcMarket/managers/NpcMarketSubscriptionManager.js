const PRICES_QUERY = 'SELECT * FROM npc_market_price';
const EMPTY_SNAPSHOT = {
  connected: false,
  prices: [],
};

export class NpcMarketSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.pricesTable = null;
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.pricesByItemKey = new Map();
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.pricesTable = connection?.db?.npcMarketPrice ?? connection?.db?.npc_market_price ?? null;

    if (!this.pricesTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.pricesTable);
    this.subscriptions = [this.subscribeQuery(PRICES_QUERY)].filter(Boolean);
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.pricesTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.pricesTable = null;
    this.subscriptions = [];
    this.pricesByItemKey = new Map();
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  getPrice(itemKey) {
    return this.pricesByItemKey.get(itemKey) ?? null;
  }

  bindTable(table) {
    table.onInsert?.(this.handleTableChange);
    table.onUpdate?.(this.handleTableChange);
    table.onDelete?.(this.handleTableChange);
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
    if (!this.pricesTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const prices = Array.from(this.pricesTable.iter())
      .map((row) => this.mapPrice(row))
      .sort((left, right) => {
        const kindCompare = left.itemKind.localeCompare(right.itemKind);

        if (kindCompare !== 0) {
          return kindCompare;
        }

        return left.itemLabel.localeCompare(right.itemLabel);
      });

    this.publish({
      connected: true,
      prices,
    });
  }

  mapPrice(row) {
    return {
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: String(row.itemLabel ?? row.item_label ?? ''),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      basePriceGold: this.toNumber(row.basePriceGold ?? row.base_price_gold),
      marketPriceGold: this.toNumber(row.marketPriceGold ?? row.market_price_gold),
      npcBuyPriceGold: this.toNumber(row.npcBuyPriceGold ?? row.npc_buy_price_gold),
      npcSellPriceGold: this.toNumber(row.npcSellPriceGold ?? row.npc_sell_price_gold),
      npcStock: this.toNumber(row.npcStock ?? row.npc_stock),
      targetStock: this.toNumber(row.targetStock ?? row.target_stock),
      demandScore: this.toNumber(row.demandScore ?? row.demand_score),
      supplyScore: this.toNumber(row.supplyScore ?? row.supply_score),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.pricesByItemKey = new Map(
      snapshot.prices.map((price) => [price.itemKey, price]),
    );
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

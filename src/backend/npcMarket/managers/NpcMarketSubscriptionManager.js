import { normalizeCoinPrice } from '../../../shared/coinPrice.js';

const PRICES_QUERY = 'SELECT * FROM npc_market_price_snapshot';
const LEGACY_PRICES_QUERY = 'SELECT * FROM npc_market_price';
const EMPTY_SNAPSHOT = {
  connected: false,
  prices: [],
};

export class NpcMarketSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.pricesTable = null;
    this.pricesQuery = PRICES_QUERY;
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.pricesByItemKey = new Map();
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.pricesTable =
      connection?.db?.npcMarketPriceSnapshot ??
      connection?.db?.npc_market_price_snapshot ??
      connection?.db?.npcMarketPrice ??
      connection?.db?.npc_market_price ??
      null;
    this.pricesQuery =
      connection?.db?.npcMarketPriceSnapshot || connection?.db?.npc_market_price_snapshot
        ? PRICES_QUERY
        : LEGACY_PRICES_QUERY;

    if (!this.pricesTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.pricesTable);
    this.subscriptions = [this.subscribeQuery(this.pricesQuery)].filter(Boolean);
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
    this.pricesQuery = PRICES_QUERY;
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
    const priceScale = row.priceScale ?? row.price_scale;

    return {
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: this.toDisplayLabel(row.itemLabel ?? row.item_label),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      basePriceCoin:
        this.toCoinPrice(
          row.basePriceCoin ?? row.basePriceGold ?? row.base_price_coin ?? row.base_price_gold,
          priceScale,
        ) ?? 0,
      marketPriceCoin:
        this.toCoinPrice(
          row.marketPriceCoin ??
            row.marketPriceGold ??
            row.market_price_coin ??
            row.market_price_gold,
          priceScale,
        ) ?? 0,
      npcBuyPriceCoin:
        this.toCoinPrice(
          row.npcBuyPriceCoin ??
            row.npcBuyPriceGold ??
            row.npc_buy_price_coin ??
            row.npc_buy_price_gold,
          priceScale,
        ) ?? 0,
      npcSellPriceCoin:
        this.toCoinPrice(
          row.npcSellPriceCoin ??
            row.npcSellPriceGold ??
            row.npc_sell_price_coin ??
            row.npc_sell_price_gold,
          priceScale,
        ) ?? 0,
      npcStock: this.toNumber(row.npcStock ?? row.npc_stock),
      targetStock: this.toNumber(row.targetStock ?? row.target_stock),
      npcNeed: this.toNumber(row.npcNeed ?? row.npc_need),
      targetNeed: this.toNumber(row.targetNeed ?? row.target_need),
      maxNeed: this.toNumber(row.maxNeed ?? row.max_need),
      demandScore: this.toNumber(row.demandScore ?? row.demand_score),
      supplyScore: this.toNumber(row.supplyScore ?? row.supply_score),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
      lastTickAtMs: this.toTimestampMs(row.lastTickAt ?? row.last_tick_at),
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

  toDisplayLabel(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  toCoinPrice(value, scaleValue) {
    const scale = Number(scaleValue) === 100 ? 100 : 1;
    return normalizeCoinPrice(this.toNumber(value) / scale);
  }
}

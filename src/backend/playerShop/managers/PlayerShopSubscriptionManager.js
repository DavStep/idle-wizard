import { normalizeGoldPrice } from '../../../shared/goldPrice.js';

const LISTINGS_QUERY = 'SELECT * FROM player_shop_listing';
const PUBLIC_LISTINGS_QUERY = 'SELECT * FROM player_shop_listing WHERE quantity > 0';
const PROCEEDS_QUERY = 'SELECT * FROM player_shop_proceeds';
const TRADE_HISTORY_QUERY = 'SELECT * FROM player_shop_trade';
const EMPTY_SNAPSHOT = {
  connected: false,
  listings: [],
  ownListings: [],
  tradeHistory: [],
  ownTradeHistory: [],
  proceedsGold: 0,
};

export class PlayerShopSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identity = null;
    this.listingsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identity = identity;
    this.listingsTable =
      connection?.db?.playerShopListing ?? connection?.db?.player_shop_listing ?? null;
    this.proceedsTable =
      connection?.db?.playerShopProceeds ?? connection?.db?.player_shop_proceeds ?? null;
    this.tradeHistoryTable =
      connection?.db?.playerShopTrade ?? connection?.db?.player_shop_trade ?? null;

    if (!this.listingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.listingsTable);
    this.bindTable(this.proceedsTable);
    this.bindTable(this.tradeHistoryTable);
    this.subscriptions = [
      ...this.getListingQueries().map((query) => this.subscribeQuery(query)),
      this.subscribeQuery(this.getProceedsQuery()),
      this.tradeHistoryTable ? this.subscribeTradeHistoryQuery() : null,
    ].filter(Boolean);
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.listingsTable);
    this.unbindTable(this.proceedsTable);
    this.unbindTable(this.tradeHistoryTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.identity = null;
    this.listingsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
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

  subscribeTradeHistoryQuery() {
    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => {
        this.unbindTable(this.tradeHistoryTable);
        this.tradeHistoryTable = null;
        this.publishFromTables();
      })
      .subscribe(TRADE_HISTORY_QUERY);
  }

  getListingQueries() {
    const identitySql = this.toIdentitySqlLiteral(this.identity);
    return identitySql
      ? [
          PUBLIC_LISTINGS_QUERY,
          `SELECT * FROM player_shop_listing WHERE "sellerIdentity" = ${identitySql}`,
        ]
      : [LISTINGS_QUERY];
  }

  getProceedsQuery() {
    const identitySql = this.toIdentitySqlLiteral(this.identity);
    return identitySql
      ? `SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" = ${identitySql}`
      : PROCEEDS_QUERY;
  }

  publishFromTables() {
    if (!this.listingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const identityKey = this.toIdentityKey(this.identity);
    const allListings = Array.from(this.listingsTable.iter())
      .map((row) => this.mapListing(row))
      .sort((left, right) => {
        const nameCompare = left.username.localeCompare(right.username);

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return left.slotNumber - right.slotNumber;
      });
    const ownListings = allListings.filter(
      (listing) => listing.sellerIdentity === identityKey,
    );
    const listings = allListings.filter(
      (listing) =>
        listing.sellerIdentity !== identityKey && listing.quantity > 0 && listing.priceGold > 0,
    );
    const proceedsRow = Array.from(this.proceedsTable.iter()).find(
      (row) => this.toIdentityKey(row.sellerIdentity ?? row.seller_identity) === identityKey,
    );
    const tradeHistory = this.getTradeHistoryRows();
    const ownTradeHistory = tradeHistory.filter(
      (trade) => trade.buyerIdentity === identityKey || trade.sellerIdentity === identityKey,
    );

    this.publish({
      connected: true,
      listings,
      ownListings,
      tradeHistory,
      ownTradeHistory,
      proceedsGold:
        this.toGoldPrice(proceedsRow?.gold, proceedsRow?.goldScale ?? proceedsRow?.gold_scale) ??
        0,
    });
  }

  mapListing(row) {
    const quantity = this.toNumber(row.quantity);
    const priceGold =
      this.toGoldPrice(row.priceGold ?? row.price_gold, row.priceScale ?? row.price_scale) ?? 0;

    return {
      listingKey: String(row.listingKey ?? row.listing_key ?? ''),
      sellerIdentity: this.toIdentityKey(row.sellerIdentity ?? row.seller_identity),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      slotNumber: this.toNumber(row.slotNumber ?? row.slot_number),
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: this.toDisplayLabel(row.itemLabel ?? row.item_label),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      quantity,
      priceGold,
      totalPriceGold: priceGold,
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  getTradeHistoryRows() {
    if (!this.tradeHistoryTable) {
      return [];
    }

    try {
      return Array.from(this.tradeHistoryTable.iter())
        .map((row) => this.mapTrade(row))
        .sort((left, right) => {
          if (left.tradedAtMs !== right.tradedAtMs) {
            return right.tradedAtMs - left.tradedAtMs;
          }

          return right.tradeId.localeCompare(left.tradeId);
        });
    } catch {
      this.unbindTable(this.tradeHistoryTable);
      this.tradeHistoryTable = null;
      return [];
    }
  }

  mapTrade(row) {
    const quantity = this.toNumber(row.quantity);
    const priceScale = row.priceScale ?? row.price_scale;
    const priceGold = this.toGoldPrice(row.priceGold ?? row.price_gold, priceScale) ?? 0;
    const buyerUsername = row.buyerUsername ?? row.buyer_username;
    const sellerUsername = row.sellerUsername ?? row.seller_username;
    const totalPriceGold =
      this.toGoldPrice(row.totalPriceGold ?? row.total_price_gold, priceScale) ?? 0;

    return {
      tradeId: this.toId(row.tradeId ?? row.trade_id),
      buyerIdentity: this.toIdentityKey(row.buyerIdentity ?? row.buyer_identity),
      buyerUsername: typeof buyerUsername === 'string' ? buyerUsername : 'wizard',
      sellerIdentity: this.toIdentityKey(row.sellerIdentity ?? row.seller_identity),
      sellerUsername: typeof sellerUsername === 'string' ? sellerUsername : 'wizard',
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: this.toDisplayLabel(row.itemLabel ?? row.item_label),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      quantity,
      priceGold,
      totalPriceGold: totalPriceGold || priceGold * quantity,
      tradedAtMs: this.toTimestampMs(row.tradedAt ?? row.traded_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
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

  toIdentitySqlLiteral(identity) {
    const identityKey = this.toIdentityKey(identity).replace(/^0x/i, '');
    return /^[0-9a-f]{64}$/i.test(identityKey) ? `0x${identityKey}` : '';
  }

  toId(value) {
    if (!value) {
      return '';
    }

    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }

    return String(value);
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

  toGoldPrice(value, scaleValue) {
    const scale = Number(scaleValue) === 100 ? 100 : 1;
    return normalizeGoldPrice(this.toNumber(value) / scale);
  }
}

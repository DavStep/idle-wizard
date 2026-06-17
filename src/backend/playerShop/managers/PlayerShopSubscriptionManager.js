import { normalizeGoldPrice } from '../../../shared/goldPrice.js';

const PUBLIC_LISTINGS_QUERY = 'SELECT * FROM public_player_shop_listing';
const OWN_LISTINGS_QUERY = 'SELECT * FROM own_player_shop_listing';
const PROCEEDS_QUERY = 'SELECT * FROM own_player_shop_proceeds';
const TRADE_HISTORY_QUERY = 'SELECT * FROM player_shop_trade_recent';
const OWN_TRADE_HISTORY_QUERY = 'SELECT * FROM own_player_shop_trade_history';
const LEGACY_PUBLIC_LISTINGS_QUERY = 'SELECT * FROM player_shop_listing WHERE quantity > 0';
const LEGACY_OWN_LISTINGS_QUERY = 'SELECT * FROM player_shop_listing WHERE "sellerIdentity" =';
const LEGACY_PROCEEDS_QUERY = 'SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" =';
const LEGACY_TRADE_HISTORY_QUERY = 'SELECT * FROM player_shop_trade';
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
    this.publicDataActive = false;
    this.publicListingsTable = null;
    this.ownListingsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
    this.ownTradeHistoryTable = null;
    this.querySources = {};
    this.publicSubscriptions = [];
    this.publicTablesBound = false;
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identity = identity;
    const publicListings = this.findTableSource({
      camelName: 'publicPlayerShopListing',
      snakeName: 'public_player_shop_listing',
      query: PUBLIC_LISTINGS_QUERY,
      legacyCamelName: 'playerShopListing',
      legacySnakeName: 'player_shop_listing',
      legacyQuery: this.getLegacyPublicListingsQuery(),
    });
    const ownListings = this.findTableSource({
      camelName: 'ownPlayerShopListing',
      snakeName: 'own_player_shop_listing',
      query: OWN_LISTINGS_QUERY,
      legacyCamelName: 'playerShopListing',
      legacySnakeName: 'player_shop_listing',
      legacyQuery: this.getLegacyOwnListingsQuery(),
    });
    const proceeds = this.findTableSource({
      camelName: 'ownPlayerShopProceeds',
      snakeName: 'own_player_shop_proceeds',
      query: PROCEEDS_QUERY,
      legacyCamelName: 'playerShopProceeds',
      legacySnakeName: 'player_shop_proceeds',
      legacyQuery: this.getLegacyProceedsQuery(),
    });
    const tradeHistory = this.findTableSource({
      camelName: 'playerShopTradeRecent',
      snakeName: 'player_shop_trade_recent',
      query: TRADE_HISTORY_QUERY,
      legacyCamelName: 'playerShopTrade',
      legacySnakeName: 'player_shop_trade',
      legacyQuery: LEGACY_TRADE_HISTORY_QUERY,
    });
    const ownTradeHistory = this.findTableSource({
      camelName: 'ownPlayerShopTradeHistory',
      snakeName: 'own_player_shop_trade_history',
      query: OWN_TRADE_HISTORY_QUERY,
      legacyCamelName: null,
      legacySnakeName: null,
      legacyQuery: null,
    });
    this.publicListingsTable = publicListings.table;
    this.ownListingsTable = ownListings.table;
    this.proceedsTable =
      proceeds.query ? proceeds.table : null;
    this.tradeHistoryTable = tradeHistory.table;
    this.ownTradeHistoryTable = ownTradeHistory.table;
    this.querySources = { publicListings, ownListings, proceeds, tradeHistory, ownTradeHistory };

    if (!this.ownListingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.ownListingsTable);
    this.bindTable(this.proceedsTable);
    this.subscriptions = [
      this.subscribeQuery(ownListings.query),
      this.subscribeQuery(proceeds.query),
    ].filter(Boolean);
    this.reconcilePublicDataSubscriptions();
    this.publishFromTables();
  }

  disconnect() {
    this.teardownPublicDataSubscriptions();
    this.unbindTable(this.ownListingsTable);
    this.unbindTable(this.proceedsTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.identity = null;
    this.publicDataActive = false;
    this.publicListingsTable = null;
    this.ownListingsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
    this.ownTradeHistoryTable = null;
    this.querySources = {};
    this.publicSubscriptions = [];
    this.publicTablesBound = false;
    this.subscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  setPublicDataActive(active = true) {
    this.publicDataActive = Boolean(active);
    this.reconcilePublicDataSubscriptions();
    this.publishFromTables();
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

  subscribeOptionalQuery(query, onError) {
    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => {
        onError?.();
        this.publishFromTables();
      })
      .subscribe(query);
  }

  reconcilePublicDataSubscriptions() {
    if (!this.connection || !this.publicListingsTable) {
      return;
    }

    if (!this.publicDataActive) {
      this.teardownPublicDataSubscriptions();
      return;
    }

    if (!this.publicTablesBound) {
      this.bindTable(this.publicListingsTable);
      this.bindTable(this.tradeHistoryTable);
      this.bindTable(this.ownTradeHistoryTable);
      this.publicTablesBound = true;
    }

    if (this.publicSubscriptions.length > 0) {
      return;
    }

    const { publicListings, tradeHistory, ownTradeHistory } = this.querySources;
    this.publicSubscriptions = [
      publicListings?.query ? this.subscribeQuery(publicListings.query) : null,
      this.tradeHistoryTable && tradeHistory?.query
        ? this.subscribeOptionalQuery(tradeHistory.query, () => {
            this.unbindTable(this.tradeHistoryTable);
            this.tradeHistoryTable = null;
            this.publishFromTables();
          })
        : null,
      this.ownTradeHistoryTable && ownTradeHistory?.query
        ? this.subscribeOptionalQuery(ownTradeHistory.query, () => {
            this.unbindTable(this.ownTradeHistoryTable);
            this.ownTradeHistoryTable = null;
            this.publishFromTables();
          })
        : null,
    ].filter(Boolean);
  }

  teardownPublicDataSubscriptions() {
    if (this.publicTablesBound) {
      this.unbindTable(this.publicListingsTable);
      this.unbindTable(this.tradeHistoryTable);
      this.unbindTable(this.ownTradeHistoryTable);
      this.publicTablesBound = false;
    }

    for (const subscription of this.publicSubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.publicSubscriptions = [];
  }

  getLegacyPublicListingsQuery() {
    return LEGACY_PUBLIC_LISTINGS_QUERY;
  }

  getLegacyOwnListingsQuery() {
    const identitySql = this.toIdentitySqlLiteral(this.identity);
    return identitySql ? `${LEGACY_OWN_LISTINGS_QUERY} ${identitySql}` : null;
  }

  getLegacyProceedsQuery() {
    const identitySql = this.toIdentitySqlLiteral(this.identity);
    return identitySql ? `${LEGACY_PROCEEDS_QUERY} ${identitySql}` : null;
  }

  publishFromTables() {
    if (!this.ownListingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const identityKey = this.toIdentityKey(this.identity);
    const publicListings = Array.from(
      this.publicDataActive ? this.publicListingsTable?.iter?.() ?? [] : [],
    )
      .map((row) => this.mapListing(row))
      .sort((left, right) => {
        const nameCompare = left.username.localeCompare(right.username);

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return left.slotNumber - right.slotNumber;
      });
    const ownListingSource =
      this.publicDataActive && this.ownListingsTable === this.publicListingsTable
        ? publicListings
        : Array.from(this.ownListingsTable.iter()).map((row) => this.mapListing(row));
    const ownListings = ownListingSource.filter(
      (listing) => listing.sellerIdentity === identityKey,
    );
    const listings = publicListings.filter(
      (listing) =>
        listing.sellerIdentity !== identityKey && listing.quantity > 0 && listing.priceGold > 0,
    );
    const proceedsRow = Array.from(this.proceedsTable.iter()).find(
      (row) => this.toIdentityKey(row.sellerIdentity ?? row.seller_identity) === identityKey,
    ) ?? null;
    const tradeHistory = this.getTradeHistoryRows();
    const ownTradeHistory = this.getOwnTradeHistoryRows(tradeHistory, identityKey);

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
    if (!this.publicDataActive || !this.tradeHistoryTable) {
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

  getOwnTradeHistoryRows(tradeHistory, identityKey) {
    if (!this.publicDataActive) {
      return [];
    }

    if (!this.ownTradeHistoryTable) {
      return tradeHistory.filter(
        (trade) => trade.buyerIdentity === identityKey || trade.sellerIdentity === identityKey,
      );
    }

    try {
      return Array.from(this.ownTradeHistoryTable.iter())
        .map((row) => this.mapTrade(row))
        .sort((left, right) => {
          if (left.tradedAtMs !== right.tradedAtMs) {
            return right.tradedAtMs - left.tradedAtMs;
          }

          return right.tradeId.localeCompare(left.tradeId);
        });
    } catch {
      this.unbindTable(this.ownTradeHistoryTable);
      this.ownTradeHistoryTable = null;
      return [];
    }
  }

  findTableSource({
    camelName,
    snakeName,
    query,
    legacyCamelName,
    legacySnakeName,
    legacyQuery,
  }) {
    const table = this.connection?.db?.[camelName] ?? this.connection?.db?.[snakeName] ?? null;
    if (table) {
      return { table, query };
    }

    return {
      table: legacyCamelName
        ? this.connection?.db?.[legacyCamelName] ?? this.connection?.db?.[legacySnakeName] ?? null
        : null,
      query: legacyQuery,
    };
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

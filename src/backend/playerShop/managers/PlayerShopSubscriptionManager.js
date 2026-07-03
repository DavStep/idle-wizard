import { normalizeCoinPrice } from '../../../shared/coinPrice.js';

const PUBLIC_LISTINGS_QUERY = 'SELECT * FROM public_player_shop_listing';
const OWN_LISTINGS_QUERY = 'SELECT * FROM own_player_shop_listing';
const PUBLIC_REQUESTS_QUERY = 'SELECT * FROM public_player_shop_request';
const OWN_REQUESTS_QUERY = 'SELECT * FROM own_player_shop_request';
const PROCEEDS_QUERY = 'SELECT * FROM own_player_shop_proceeds';
const TRADE_HISTORY_QUERY = 'SELECT * FROM player_shop_trade_recent';
const OWN_TRADE_HISTORY_QUERY = 'SELECT * FROM own_player_shop_trade_history';
const OWN_ROYALTY_HISTORY_QUERY = 'SELECT * FROM own_potion_recipe_royalty_history';
const LEGACY_PUBLIC_LISTINGS_QUERY = 'SELECT * FROM player_shop_listing WHERE quantity > 0';
const LEGACY_OWN_LISTINGS_QUERY = 'SELECT * FROM player_shop_listing WHERE "sellerIdentity" =';
const LEGACY_PROCEEDS_QUERY = 'SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" =';
const LEGACY_TRADE_HISTORY_QUERY = 'SELECT * FROM player_shop_trade';
const EMPTY_SNAPSHOT = {
  connected: false,
  identity: '',
  listings: [],
  ownListings: [],
  requests: [],
  ownRequests: [],
  tradeHistory: [],
  ownTradeHistory: [],
  ownRoyaltyHistory: [],
  proceedsCoin: 0,
};

export class PlayerShopSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identity = null;
    this.marketDataActive = false;
    this.tradeHistoryActive = false;
    this.publicListingsTable = null;
    this.ownListingsTable = null;
    this.publicRequestsTable = null;
    this.ownRequestsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
    this.ownTradeHistoryTable = null;
    this.ownRoyaltyHistoryTable = null;
    this.querySources = {};
    this.marketSubscriptions = [];
    this.tradeHistorySubscriptions = [];
    this.marketTablesBound = false;
    this.tradeHistoryTablesBound = false;
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
    const publicRequests = this.findTableSource({
      camelName: 'publicPlayerShopRequest',
      snakeName: 'public_player_shop_request',
      query: PUBLIC_REQUESTS_QUERY,
      legacyCamelName: null,
      legacySnakeName: null,
      legacyQuery: null,
    });
    const ownRequests = this.findTableSource({
      camelName: 'ownPlayerShopRequest',
      snakeName: 'own_player_shop_request',
      query: OWN_REQUESTS_QUERY,
      legacyCamelName: null,
      legacySnakeName: null,
      legacyQuery: null,
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
    const ownRoyaltyHistory = this.findTableSource({
      camelName: 'ownPotionRecipeRoyaltyHistory',
      snakeName: 'own_potion_recipe_royalty_history',
      query: OWN_ROYALTY_HISTORY_QUERY,
      legacyCamelName: null,
      legacySnakeName: null,
      legacyQuery: null,
    });
    this.publicListingsTable = publicListings.table;
    this.ownListingsTable = ownListings.table;
    this.publicRequestsTable = publicRequests.table;
    this.ownRequestsTable = ownRequests.table;
    this.proceedsTable =
      proceeds.query ? proceeds.table : null;
    this.tradeHistoryTable = tradeHistory.table;
    this.ownTradeHistoryTable = ownTradeHistory.table;
    this.ownRoyaltyHistoryTable = ownRoyaltyHistory.table;
    this.querySources = {
      publicListings,
      ownListings,
      publicRequests,
      ownRequests,
      proceeds,
      tradeHistory,
      ownTradeHistory,
      ownRoyaltyHistory,
    };

    if (!this.ownListingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.ownListingsTable);
    this.bindTable(this.ownRequestsTable);
    this.bindTable(this.proceedsTable);
    this.subscriptions = [
      this.subscribeQuery(ownListings.query),
      ownRequests.query ? this.subscribeOptionalQuery(ownRequests.query, () => {
        this.unbindTable(this.ownRequestsTable);
        this.ownRequestsTable = null;
      }) : null,
      this.subscribeQuery(proceeds.query),
    ].filter(Boolean);
    this.reconcilePublicDataSubscriptions();
    this.publishFromTables();
  }

  disconnect() {
    this.teardownMarketDataSubscriptions();
    this.teardownTradeHistorySubscriptions();
    this.unbindTable(this.ownListingsTable);
    this.unbindTable(this.ownRequestsTable);
    this.unbindTable(this.proceedsTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.identity = null;
    this.marketDataActive = false;
    this.tradeHistoryActive = false;
    this.publicListingsTable = null;
    this.ownListingsTable = null;
    this.publicRequestsTable = null;
    this.ownRequestsTable = null;
    this.proceedsTable = null;
    this.tradeHistoryTable = null;
    this.ownTradeHistoryTable = null;
    this.ownRoyaltyHistoryTable = null;
    this.querySources = {};
    this.marketSubscriptions = [];
    this.tradeHistorySubscriptions = [];
    this.marketTablesBound = false;
    this.tradeHistoryTablesBound = false;
    this.subscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  setPublicDataActive(active = true) {
    this.marketDataActive = Boolean(active);
    this.tradeHistoryActive = Boolean(active);
    this.reconcilePublicDataSubscriptions();
    this.publishFromTables();
  }

  setMarketDataActive(active = true) {
    this.marketDataActive = Boolean(active);
    this.reconcileMarketDataSubscriptions();
    this.publishFromTables();
  }

  setTradeHistoryActive(active = true) {
    this.tradeHistoryActive = Boolean(active);
    this.reconcileTradeHistorySubscriptions();
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
    this.reconcileMarketDataSubscriptions();
    this.reconcileTradeHistorySubscriptions();
  }

  reconcileMarketDataSubscriptions() {
    if (!this.connection || !this.publicListingsTable) {
      return;
    }

    if (!this.marketDataActive) {
      this.teardownMarketDataSubscriptions();
      return;
    }

    if (!this.marketTablesBound) {
      this.bindTable(this.publicListingsTable);
      this.bindTable(this.publicRequestsTable);
      this.marketTablesBound = true;
    }

    if (this.marketSubscriptions.length > 0) {
      return;
    }

    const { publicListings, publicRequests } = this.querySources;
    this.marketSubscriptions = [
      publicListings?.query ? this.subscribeQuery(publicListings.query) : null,
      this.publicRequestsTable && publicRequests?.query
        ? this.subscribeOptionalQuery(publicRequests.query, () => {
            this.unbindTable(this.publicRequestsTable);
            this.publicRequestsTable = null;
            this.publishFromTables();
          })
        : null,
    ].filter(Boolean);
  }

  reconcileTradeHistorySubscriptions() {
    if (!this.connection) {
      return;
    }

    if (!this.tradeHistoryActive) {
      this.teardownTradeHistorySubscriptions();
      return;
    }

    if (!this.tradeHistoryTable && !this.ownTradeHistoryTable && !this.ownRoyaltyHistoryTable) {
      return;
    }

    if (!this.tradeHistoryTablesBound) {
      this.bindTable(this.tradeHistoryTable);
      this.bindTable(this.ownTradeHistoryTable);
      this.bindTable(this.ownRoyaltyHistoryTable);
      this.tradeHistoryTablesBound = true;
    }

    if (this.tradeHistorySubscriptions.length > 0) {
      return;
    }

    const { tradeHistory, ownTradeHistory, ownRoyaltyHistory } = this.querySources;
    this.tradeHistorySubscriptions = [
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
      this.ownRoyaltyHistoryTable && ownRoyaltyHistory?.query
        ? this.subscribeOptionalQuery(ownRoyaltyHistory.query, () => {
            this.unbindTable(this.ownRoyaltyHistoryTable);
            this.ownRoyaltyHistoryTable = null;
            this.publishFromTables();
          })
        : null,
    ].filter(Boolean);
  }

  teardownMarketDataSubscriptions() {
    if (this.marketTablesBound) {
      this.unbindTable(this.publicListingsTable);
      this.unbindTable(this.publicRequestsTable);
      this.marketTablesBound = false;
    }

    for (const subscription of this.marketSubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.marketSubscriptions = [];
  }

  teardownTradeHistorySubscriptions() {
    if (this.tradeHistoryTablesBound) {
      this.unbindTable(this.tradeHistoryTable);
      this.unbindTable(this.ownTradeHistoryTable);
      this.unbindTable(this.ownRoyaltyHistoryTable);
      this.tradeHistoryTablesBound = false;
    }

    for (const subscription of this.tradeHistorySubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.tradeHistorySubscriptions = [];
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
      this.marketDataActive ? this.publicListingsTable?.iter?.() ?? [] : [],
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
      this.marketDataActive && this.ownListingsTable === this.publicListingsTable
        ? publicListings
        : Array.from(this.ownListingsTable.iter()).map((row) => this.mapListing(row));
    const ownListings = ownListingSource.filter(
      (listing) => listing.sellerIdentity === identityKey,
    );
    const listings = publicListings.filter(
      (listing) =>
        listing.sellerIdentity !== identityKey && listing.quantity > 0 && listing.priceCoin > 0,
    );
    const publicRequests = Array.from(
      this.marketDataActive ? this.publicRequestsTable?.iter?.() ?? [] : [],
    )
      .map((row) => this.mapRequest(row))
      .sort((left, right) => {
        const nameCompare = left.username.localeCompare(right.username);

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return left.slotNumber - right.slotNumber;
      });
    const ownRequestSource =
      this.marketDataActive && this.ownRequestsTable === this.publicRequestsTable
        ? publicRequests
        : Array.from(this.ownRequestsTable?.iter?.() ?? []).map((row) => this.mapRequest(row));
    const ownRequests = ownRequestSource.filter(
      (request) => request.requesterIdentity === identityKey,
    );
    const requests = publicRequests.filter(
      (request) =>
        request.requesterIdentity !== identityKey && request.quantity > 0 && request.priceCoin > 0,
    );
    const proceedsRow = Array.from(this.proceedsTable.iter()).find(
      (row) => this.toIdentityKey(row.sellerIdentity ?? row.seller_identity) === identityKey,
    ) ?? null;
    const tradeHistory = this.getTradeHistoryRows();
    const ownTradeHistory = this.getOwnTradeHistoryRows(tradeHistory, identityKey);
    const ownRoyaltyHistory = this.getOwnRoyaltyHistoryRows();

    this.publish({
      connected: true,
      identity: identityKey,
      listings,
      ownListings,
      requests,
      ownRequests,
      tradeHistory,
      ownTradeHistory,
      ownRoyaltyHistory,
      proceedsCoin:
        this.toCoinPrice(
          proceedsRow?.coin ?? proceedsRow?.gold,
          proceedsRow?.coinScale ??
            proceedsRow?.goldScale ??
            proceedsRow?.coin_scale ??
            proceedsRow?.gold_scale,
        ) ?? 0,
    });
  }

  mapListing(row) {
    const quantity = this.toNumber(row.quantity);
    const priceCoin =
      this.toCoinPrice(
        row.priceCoin ?? row.priceGold ?? row.price_coin ?? row.price_gold,
        row.priceScale ?? row.price_scale,
      ) ?? 0;

    return {
      listingKey: String(row.listingKey ?? row.listing_key ?? ''),
      sellerIdentity: this.toIdentityKey(row.sellerIdentity ?? row.seller_identity),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      slotNumber: this.toNumber(row.slotNumber ?? row.slot_number),
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: this.toDisplayLabel(row.itemLabel ?? row.item_label),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      quantity,
      priceCoin,
      totalPriceCoin: priceCoin,
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  mapRequest(row) {
    const quantity = this.toNumber(row.quantity);
    const priceCoin =
      this.toCoinPrice(
        row.priceCoin ?? row.priceGold ?? row.price_coin ?? row.price_gold,
        row.priceScale ?? row.price_scale,
      ) ?? 0;

    return {
      requestKey: String(row.requestKey ?? row.request_key ?? ''),
      requesterIdentity: this.toIdentityKey(row.requesterIdentity ?? row.requester_identity),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      slotNumber: this.toNumber(row.slotNumber ?? row.slot_number),
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: this.toDisplayLabel(row.itemLabel ?? row.item_label),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      quantity,
      priceCoin,
      totalPriceCoin: priceCoin,
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  getTradeHistoryRows() {
    if (!this.tradeHistoryActive || !this.tradeHistoryTable) {
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
    if (!this.tradeHistoryActive) {
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

  getOwnRoyaltyHistoryRows() {
    if (!this.tradeHistoryActive || !this.ownRoyaltyHistoryTable) {
      return [];
    }

    try {
      return Array.from(this.ownRoyaltyHistoryTable.iter())
        .map((row) => this.mapRoyalty(row))
        .sort((left, right) => {
          if (left.awardedAtMs !== right.awardedAtMs) {
            return right.awardedAtMs - left.awardedAtMs;
          }

          return right.royaltyId.localeCompare(left.royaltyId);
        });
    } catch {
      this.unbindTable(this.ownRoyaltyHistoryTable);
      this.ownRoyaltyHistoryTable = null;
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
    const priceCoin =
      this.toCoinPrice(
        row.priceCoin ?? row.priceGold ?? row.price_coin ?? row.price_gold,
        priceScale,
      ) ?? 0;
    const buyerUsername = row.buyerUsername ?? row.buyer_username;
    const sellerUsername = row.sellerUsername ?? row.seller_username;
    const totalPriceCoin =
      this.toCoinPrice(
        row.totalPriceCoin ??
          row.totalPriceGold ??
          row.total_price_coin ??
          row.total_price_gold,
        priceScale,
      ) ?? 0;

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
      priceCoin,
      totalPriceCoin: totalPriceCoin || priceCoin * quantity,
      tradedAtMs: this.toTimestampMs(row.tradedAt ?? row.traded_at),
    };
  }

  mapRoyalty(row) {
    const goldScale = row.goldScale ?? row.gold_scale;
    const sourceSellerUsername = row.sourceSellerUsername ?? row.source_seller_username;

    return {
      royaltyId: this.toId(row.royaltyId ?? row.royalty_id),
      recipientIdentity: this.toIdentityKey(row.recipientIdentity ?? row.recipient_identity),
      sourceSellerIdentity: this.toIdentityKey(
        row.sourceSellerIdentity ?? row.source_seller_identity,
      ),
      sourceSellerUsername:
        typeof sourceSellerUsername === 'string' ? sourceSellerUsername : 'wizard',
      potionKey: String(row.potionKey ?? row.potion_key ?? ''),
      potionLabel: this.toDisplayLabel(row.potionLabel ?? row.potion_label),
      royaltyCoin:
        this.toCoinPrice(
          row.royaltyCoin ?? row.royaltyGold ?? row.royalty_coin ?? row.royalty_gold,
          goldScale,
        ) ?? 0,
      sourceIncomeCoin:
        this.toCoinPrice(
          row.sourceIncomeCoin ??
            row.sourceIncomeGold ??
            row.source_income_coin ??
            row.source_income_gold,
          goldScale,
        ) ?? 0,
      awardedAtMs: this.toTimestampMs(row.awardedAt ?? row.awarded_at),
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

  toCoinPrice(value, scaleValue) {
    const scale = Number(scaleValue) === 100 ? 100 : 1;
    return normalizeCoinPrice(this.toNumber(value) / scale);
  }
}

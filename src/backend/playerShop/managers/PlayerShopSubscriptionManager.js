const LISTINGS_QUERY = 'SELECT * FROM player_shop_listing';
const PROCEEDS_QUERY = 'SELECT * FROM player_shop_proceeds';
const EMPTY_SNAPSHOT = {
  connected: false,
  listings: [],
  ownListings: [],
  proceedsGold: 0,
};

export class PlayerShopSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identity = null;
    this.listingsTable = null;
    this.proceedsTable = null;
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

    if (!this.listingsTable || !this.proceedsTable) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.listingsTable);
    this.bindTable(this.proceedsTable);
    this.subscriptions = [this.subscribeQuery(LISTINGS_QUERY), this.subscribeQuery(PROCEEDS_QUERY)]
      .filter(Boolean);
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.listingsTable);
    this.unbindTable(this.proceedsTable);

    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.identity = null;
    this.listingsTable = null;
    this.proceedsTable = null;
    this.subscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
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

    this.publish({
      connected: true,
      listings,
      ownListings,
      proceedsGold: this.toNumber(proceedsRow?.gold),
    });
  }

  mapListing(row) {
    const quantity = this.toNumber(row.quantity);
    const priceGold = this.toNumber(row.priceGold ?? row.price_gold);

    return {
      listingKey: String(row.listingKey ?? row.listing_key ?? ''),
      sellerIdentity: this.toIdentityKey(row.sellerIdentity ?? row.seller_identity),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      slotNumber: this.toNumber(row.slotNumber ?? row.slot_number),
      itemKey: String(row.itemKey ?? row.item_key ?? ''),
      itemLabel: String(row.itemLabel ?? row.item_label ?? ''),
      itemKind: String(row.itemKind ?? row.item_kind ?? ''),
      quantity,
      priceGold,
      totalPriceGold: priceGold,
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
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

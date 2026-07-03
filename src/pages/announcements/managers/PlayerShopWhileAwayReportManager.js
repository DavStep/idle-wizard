export class PlayerShopWhileAwayReportManager {
  static explain =
    'Turns player-market trade and royalty history rows into while-away report rows without changing market rules.';

  constructor({ playerShopFacade } = {}) {
    this.playerShopFacade = playerShopFacade;
    this.snapshot = null;
    this.unsubscribe = null;
    this.releaseTradeHistory = null;
    this.onRows = null;
    this.initialized = false;
    this.reportedProceedsCoin = 0;
    this.seenTradeIds = new Set();
    this.seenRoyaltyIds = new Set();
  }

  mount({ onRows } = {}) {
    this.onRows = typeof onRows === 'function' ? onRows : null;
    this.releaseTradeHistory = this.playerShopFacade?.retainTradeHistory?.() ?? null;
    this.unsubscribe =
      this.playerShopFacade?.subscribe?.((snapshot) => this.handleSnapshot(snapshot)) ?? null;

    if (!this.initialized) {
      this.snapshot = this.playerShopFacade?.getSnapshot?.() ?? null;
      this.initialized = true;
    }
  }

  unmount() {
    this.unsubscribe?.();
    this.releaseTradeHistory?.();
    this.unsubscribe = null;
    this.releaseTradeHistory = null;
    this.onRows = null;
    this.snapshot = null;
    this.initialized = false;
    this.reportedProceedsCoin = 0;
    this.seenTradeIds.clear();
    this.seenRoyaltyIds.clear();
  }

  handleSnapshot(snapshot) {
    const wasInitialized = this.initialized;
    this.snapshot = snapshot ?? null;
    this.initialized = true;

    if (!wasInitialized) {
      return;
    }

    const rows = this.consumeRows();

    if (rows.length > 0) {
      this.onRows?.(rows);
    }
  }

  consumeReport() {
    const rows = this.consumeRows();

    if (rows.length <= 0) {
      return null;
    }

    return {
      kind: 'whileAway',
      source: 'player_market',
      offlineSeconds: 0,
      rows,
    };
  }

  consumeRows() {
    const snapshot = this.snapshot ?? this.playerShopFacade?.getSnapshot?.() ?? null;

    if (!snapshot || snapshot.connected === false) {
      return [];
    }

    this.snapshot = snapshot;

    const rows = [];
    const proceedsCoin = this.getPositiveCoin(snapshot.proceedsCoin);
    const proceedsDelta = proceedsCoin - this.reportedProceedsCoin;
    const tradeRows = this.consumeTradeRows(snapshot);
    const royaltyRows = this.consumeRoyaltyRows(snapshot);

    rows.push(...tradeRows.playerBoughtRows);
    rows.push(...tradeRows.playerSoldYouRows);
    rows.push(...royaltyRows.rows);

    const matchedProceedsCoin = tradeRows.proceedsCoin + royaltyRows.proceedsCoin;
    const unmatchedProceedsCoin = proceedsDelta - matchedProceedsCoin;
    if (unmatchedProceedsCoin > 0) {
      rows.push({ type: 'market_proceeds', coin: unmatchedProceedsCoin });
    }

    this.reportedProceedsCoin = proceedsCoin;
    return rows;
  }

  consumeTradeRows(snapshot = {}) {
    const ownIdentities = this.getOwnIdentities(snapshot);

    if (ownIdentities.size <= 0) {
      return {
        playerBoughtRows: [],
        playerSoldYouRows: [],
        proceedsCoin: 0,
      };
    }

    const requestItems = this.getOwnRequestItemKeys(snapshot);
    const playerBoughtRows = [];
    const playerSoldYouRows = [];
    let proceedsCoin = 0;

    for (const trade of snapshot.ownTradeHistory ?? []) {
      const tradeId = this.getTradeId(trade);

      if (!tradeId || this.seenTradeIds.has(tradeId)) {
        continue;
      }

      const buyerIdentity = this.getIdentity(trade.buyerIdentity);
      const sellerIdentity = this.getIdentity(trade.sellerIdentity);
      const isBuyer = buyerIdentity && ownIdentities.has(buyerIdentity);
      const isSeller = sellerIdentity && ownIdentities.has(sellerIdentity);

      if (isBuyer && !isSeller && this.isRequestFillTrade(trade, requestItems)) {
        playerSoldYouRows.push({
          type: 'player_trade_sold_to_you',
          label: this.normalizeLabel(trade.itemLabel, 'items'),
          quantity: this.getPositiveCount(trade.quantity, 1),
          coin: this.getPositiveCoin(trade.totalPriceCoin ?? trade.priceCoin),
          username: this.normalizeLabel(trade.sellerUsername, 'player'),
        });
        this.seenTradeIds.add(tradeId);
        continue;
      }

      if (isSeller && !isBuyer) {
        const coin = this.getPositiveCoin(trade.totalPriceCoin ?? trade.priceCoin);
        proceedsCoin += coin;
        playerBoughtRows.push({
          type: 'player_trade_bought_from_you',
          label: this.normalizeLabel(trade.itemLabel, 'items'),
          quantity: this.getPositiveCount(trade.quantity, 1),
          coin,
          username: this.normalizeLabel(trade.buyerUsername, 'player'),
        });
        this.seenTradeIds.add(tradeId);
      }
    }

    return {
      playerBoughtRows,
      playerSoldYouRows,
      proceedsCoin,
    };
  }

  consumeRoyaltyRows(snapshot = {}) {
    const rows = [];
    let proceedsCoin = 0;

    for (const royalty of snapshot.ownRoyaltyHistory ?? []) {
      const royaltyId = this.getRoyaltyId(royalty);

      if (!royaltyId || this.seenRoyaltyIds.has(royaltyId)) {
        continue;
      }

      const coin = this.getPositiveCoin(royalty.royaltyCoin);

      if (coin <= 0) {
        this.seenRoyaltyIds.add(royaltyId);
        continue;
      }

      proceedsCoin += coin;
      rows.push({
        type: 'potion_royalty_earned',
        label: this.normalizeLabel(royalty.potionLabel, 'potion'),
        coin,
        username: this.normalizeLabel(royalty.sourceSellerUsername, 'player'),
      });
      this.seenRoyaltyIds.add(royaltyId);
    }

    return {
      rows,
      proceedsCoin,
    };
  }

  getOwnIdentities(snapshot = {}) {
    const identities = new Set();

    for (const value of [snapshot.identity, snapshot.playerIdentity, snapshot.ownIdentity]) {
      const identity = this.getIdentity(value);

      if (identity) {
        identities.add(identity);
      }
    }

    for (const listing of snapshot.ownListings ?? []) {
      const identity = this.getIdentity(listing?.sellerIdentity);

      if (identity) {
        identities.add(identity);
      }
    }

    for (const request of snapshot.ownRequests ?? []) {
      const identity = this.getIdentity(request?.requesterIdentity);

      if (identity) {
        identities.add(identity);
      }
    }

    return identities;
  }

  getOwnRequestItemKeys(snapshot = {}) {
    return new Set(
      (snapshot.ownRequests ?? [])
        .map((request) => this.getItemMatchKey(request))
        .filter(Boolean),
    );
  }

  isRequestFillTrade(trade = {}, requestItems = new Set()) {
    if (typeof trade.requestKey === 'string' && trade.requestKey.trim()) {
      return true;
    }

    const itemKey = this.getItemMatchKey(trade);
    return Boolean(itemKey && requestItems.has(itemKey));
  }

  getItemMatchKey(value = {}) {
    return (
      String(value.itemKey ?? '')
        .trim()
        .toLowerCase() ||
      String(value.itemLabel ?? '')
        .trim()
        .toLowerCase() ||
      null
    );
  }

  getTradeId(trade = {}) {
    return String(trade.tradeId ?? trade.trade_id ?? '').trim();
  }

  getRoyaltyId(royalty = {}) {
    return String(royalty.royaltyId ?? royalty.royalty_id ?? '').trim();
  }

  getIdentity(value) {
    return String(value ?? '').trim() || null;
  }

  normalizeLabel(value, fallback) {
    return (
      String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim() || fallback
    );
  }

  getPositiveCount(value, fallback = 1) {
    const count = Math.floor(Number(value) || 0);
    return count > 0 ? count : fallback;
  }

  getPositiveCoin(value) {
    const coin = Math.round((Number(value) || 0) * 100) / 100;
    return coin > 0 ? coin : 0;
  }
}

export class PlayerShopWhileAwayReportManager {
  static explain =
    'Turns existing player-market proceeds and request-fill trade rows into while-away report rows without changing market rules.';

  constructor({ playerShopFacade } = {}) {
    this.playerShopFacade = playerShopFacade;
    this.snapshot = null;
    this.unsubscribe = null;
    this.releaseTradeHistory = null;
    this.onRows = null;
    this.initialized = false;
    this.reportedProceedsCoin = 0;
    this.seenTradeIds = new Set();
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
    const proceedsCoin = this.getPositiveCount(snapshot.proceedsCoin, 0);
    const proceedsDelta = proceedsCoin - this.reportedProceedsCoin;

    if (proceedsDelta > 0) {
      rows.push({ type: 'player_market_sold', coin: proceedsDelta });
    }

    this.reportedProceedsCoin = proceedsCoin;
    rows.push(
      ...this.consumeTradeRows(snapshot, {
        sellerSalesCoveredByProceeds: proceedsDelta > 0,
      }),
    );
    return rows;
  }

  consumeTradeRows(snapshot = {}, { sellerSalesCoveredByProceeds = false } = {}) {
    const ownIdentities = this.getOwnIdentities(snapshot);

    if (ownIdentities.size <= 0) {
      return [];
    }

    const requestItems = this.getOwnRequestItemKeys(snapshot);
    const requestFills = new Map();
    let sellerSaleCoin = 0;

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
        this.addItemQuantity(requestFills, trade);
        this.seenTradeIds.add(tradeId);
        continue;
      }

      if (isSeller && !isBuyer) {
        if (!sellerSalesCoveredByProceeds) {
          sellerSaleCoin += this.getPositiveCount(trade.totalPriceCoin ?? trade.priceCoin, 0);
        }

        this.seenTradeIds.add(tradeId);
      }
    }

    const rows = Array.from(requestFills.values()).map((item) => ({
      type: 'player_request_filled',
      label: item.label,
      quantity: item.quantity,
    }));

    if (sellerSaleCoin > 0) {
      rows.push({ type: 'player_market_sold', coin: sellerSaleCoin });
    }

    return rows;
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

  addItemQuantity(items, trade = {}) {
    const key = this.getItemMatchKey(trade) || this.normalizeLabel(trade.itemLabel, 'item');
    const existing = items.get(key) ?? {
      label: this.normalizeLabel(trade.itemLabel, 'item'),
      quantity: 0,
    };

    existing.quantity += this.getPositiveCount(trade.quantity, 1);
    items.set(key, existing);
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
}

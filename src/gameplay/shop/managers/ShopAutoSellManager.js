const MAX_BACKEND_TRADE_QUANTITY = 10_000;

export class ShopAutoSellManager {
  constructor({
    coinFacade,
    itemsFacade,
    shopBalanceManager,
    shopNpcPriceManager,
    shopNpcSellQuoteManager,
    shopShelfEntityManager,
    getAccessibleSlotCount,
    getItemAccess,
    getStallBatchSize,
    onItemSold,
  }) {
    this.coinFacade = coinFacade;
    this.itemsFacade = itemsFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopNpcSellQuoteManager = shopNpcSellQuoteManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.getAccessibleSlotCount = getAccessibleSlotCount;
    this.getItemAccess = getItemAccess;
    this.getStallBatchSize = getStallBatchSize;
    this.onItemSold = onItemSold;
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) return;
    systemManager.register({
      update: (_world, frame) => this.update(this.getTimerDeltaSeconds(frame)),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    const activeSlots = this.getActiveSellSlots();
    this.shopNpcPriceManager?.syncPriceRetention?.(activeSlots.length > 0);
    if (activeSlots.length <= 0 || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const cycleSeconds = this.shopBalanceManager.getAutoSellSeconds();
    const npcNeedByItemKey = new Map();
    const backendQuantityByItemKey = new Map();

    for (const slot of activeSlots) {
      const sale = this.processSlot(slot, {
        cycleSeconds,
        deltaSeconds,
        npcNeedByItemKey,
      });
      if (!sale?.item?.key || sale.quantity <= 0) continue;
      backendQuantityByItemKey.set(
        sale.item.key,
        (backendQuantityByItemKey.get(sale.item.key) ?? 0) + sale.quantity,
      );
    }

    this.recordBackendSales(backendQuantityByItemKey);
  }

  hasFrameTimerWork() {
    return this.getActiveSellSlots().length > 0;
  }

  processSlot(slot, { cycleSeconds, deltaSeconds, npcNeedByItemKey }) {
    if (!Number.isFinite(cycleSeconds) || cycleSeconds <= 0) return null;

    const progressSeconds = Math.max(0, Number(slot.sellProgressSeconds) || 0) + deltaSeconds;
    const cyclesDue = Math.floor(progressSeconds / cycleSeconds);
    if (cyclesDue <= 0) {
      this.shopShelfEntityManager.setSlotSellProgressSeconds(
        slot.slotNumber,
        progressSeconds,
      );
      return null;
    }

    const result = this.sellSlot(slot, {
      cyclesDue,
      npcNeedByItemKey,
    });
    if (result.blocked) {
      this.shopShelfEntityManager.setSlotSellProgressSeconds(
        slot.slotNumber,
        progressSeconds,
      );
      return null;
    }

    const remainingProgressSeconds = progressSeconds % cycleSeconds;
    const nextSlot = this.shopShelfEntityManager
      .getSlotSnapshots()
      .find((candidate) => candidate.slotNumber === slot.slotNumber);
    if (nextSlot?.loadedQuantity > 0) {
      this.shopShelfEntityManager.setSlotSellProgressSeconds(
        slot.slotNumber,
        remainingProgressSeconds,
      );
    }
    return result.sold ? result : null;
  }

  sellSlot(slot, { cyclesDue = 1, npcNeedByItemKey = null } = {}) {
    const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
    const coin = this.shopNpcPriceManager.getNpcBuyPriceCoin(item);
    if (!Number.isFinite(coin)) {
      return { sold: false, blocked: this.isPriceDataPending() };
    }
    if (coin <= 0) return { sold: false, blocked: false };

    const npcNeed = this.getAvailableNpcNeed(item, npcNeedByItemKey);
    if (!Number.isFinite(npcNeed)) {
      return { sold: false, blocked: this.isPriceDataPending() };
    }
    if (npcNeed <= 0) return { sold: false, blocked: false };

    const batchSize = Math.max(
      1,
      Math.floor(Number(this.getStallBatchSize?.(slot.slotNumber)) || 1),
    );
    const quantity = Math.min(
      slot.loadedQuantity,
      npcNeed,
      cyclesDue * batchSize,
      MAX_BACKEND_TRADE_QUANTITY,
    );
    if (quantity <= 0) return { sold: false, blocked: false };

    const quote = this.quoteSale(item, quantity, coin, { npcNeed });
    if (!quote.ok) {
      return {
        sold: false,
        blocked:
          this.isPriceDataPending() &&
          (quote.reason === 'missing_price' || quote.reason === 'missing_need'),
      };
    }

    this.coinFacade.add(quote.totalPriceCoin);
    this.shopShelfEntityManager.changeSlotLoadedQuantity(slot.slotNumber, -quantity);
    this.consumeNpcNeed(item, quantity, npcNeedByItemKey);
    this.onItemSold?.({
      item,
      coin: quote.totalPriceCoin,
      quantity,
      slotNumber: slot.slotNumber,
    });
    return { sold: true, blocked: false, item, quantity };
  }

  recordBackendSales(quantityByItemKey) {
    for (const [itemKey, totalQuantity] of quantityByItemKey) {
      const item = this.itemsFacade.safeGetDefinitionByKey(itemKey);
      let remaining = totalQuantity;
      while (item && remaining > 0) {
        const quantity = Math.min(MAX_BACKEND_TRADE_QUANTITY, remaining);
        void this.shopNpcPriceManager.recordSellToNpc(item, quantity);
        remaining -= quantity;
      }
    }
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }

  getActiveSellSlots() {
    return this.shopShelfEntityManager
      .getSlotSnapshots()
      .filter(
        (slot) =>
          slot.slotNumber <=
          (this.getAccessibleSlotCount?.() ?? Number.POSITIVE_INFINITY),
      )
      .filter((slot) => this.isActiveSellSlot(slot));
  }

  isActiveSellSlot(slot) {
    const item = slot?.sellItemTypeId
      ? this.itemsFacade.getItemDefinition(slot.sellItemTypeId)
      : null;
    const marketAccess = item ? this.getItemAccess?.(item) : null;
    return Boolean(
      slot?.unlocked &&
        slot.sellItemTypeId &&
        slot.loadedQuantity > 0 &&
        (!marketAccess || marketAccess.tradedHere),
    );
  }

  isPriceDataPending() {
    return this.shopNpcPriceManager?.needsBackendPrices?.() !== false;
  }

  getAvailableNpcNeed(item, npcNeedByItemKey) {
    const itemKey = item?.key ? String(item.key) : null;
    if (!itemKey || !npcNeedByItemKey) return this.getNpcNeedForItem(item);
    if (!npcNeedByItemKey.has(itemKey)) {
      npcNeedByItemKey.set(itemKey, this.getNpcNeedForItem(item));
    }
    return npcNeedByItemKey.get(itemKey);
  }

  getNpcNeedForItem(item) {
    if (typeof this.shopNpcPriceManager.getNpcNeed !== 'function') return 10_000;
    const need = this.shopNpcPriceManager.getNpcNeed?.(item);
    if (!Number.isFinite(need)) return null;
    return need <= 0 ? 0 : Math.floor(need);
  }

  consumeNpcNeed(item, quantity, npcNeedByItemKey) {
    const itemKey = item?.key ? String(item.key) : null;
    if (!itemKey || !npcNeedByItemKey) return;
    const npcNeed = npcNeedByItemKey.get(itemKey);
    if (Number.isFinite(npcNeed)) {
      npcNeedByItemKey.set(itemKey, Math.max(0, npcNeed - quantity));
    }
  }

  quoteSale(item, quantity, fallbackPriceCoin, { npcNeed = null } = {}) {
    return (
      this.shopNpcSellQuoteManager?.quoteItem?.({ item, quantity, npcNeed }) ?? {
        ok: true,
        quantity,
        priceCoin: fallbackPriceCoin,
        totalPriceCoin: fallbackPriceCoin * quantity,
      }
    );
  }
}

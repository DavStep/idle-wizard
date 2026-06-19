export class ShopAutoSellManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopBalanceManager,
    shopNpcPriceManager,
    shopNpcSellQuoteManager,
    shopSellAvailabilityManager,
    shopShelfEntityManager,
    onItemSold,
    now = () => Date.now(),
  }) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopNpcSellQuoteManager = shopNpcSellQuoteManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.onItemSold = onItemSold;
    this.now = now;
    this.registered = false;
    this.pendingCycleCount = 0;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => this.update(this.getTimerDeltaSeconds(frame)),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    const autoSellSeconds = this.shopBalanceManager.getAutoSellSeconds();
    const nowSeconds = this.getNowSeconds();
    const progressSeconds = this.getGlobalProgressSeconds(autoSellSeconds, nowSeconds);
    const activeSlots = this.shopShelfEntityManager
      .getSlotSnapshots()
      .filter((slot) => slot.unlocked && slot.sellItemTypeId);
    this.syncPriceRetention(activeSlots);

    if (activeSlots.length <= 0) {
      this.pendingCycleCount = 0;
      this.shopShelfEntityManager.setSellProgressSeconds(progressSeconds);
      return;
    }

    this.pendingCycleCount += this.getElapsedCycleCount({
      autoSellSeconds,
      deltaSeconds,
      nowSeconds,
    });

    this.processPendingCycles(activeSlots);

    this.shopShelfEntityManager.setSellProgressSeconds(progressSeconds);
  }

  syncPriceRetention(activeSlots) {
    this.shopNpcPriceManager?.syncPriceRetention?.(activeSlots.length > 0);
  }

  getNowSeconds() {
    const nowMs = this.now?.();

    return Number.isFinite(nowMs) ? Math.max(0, nowMs / 1000) : 0;
  }

  getGlobalProgressSeconds(autoSellSeconds, nowSeconds = this.getNowSeconds()) {
    if (!Number.isFinite(autoSellSeconds) || autoSellSeconds <= 0) {
      return 0;
    }

    return nowSeconds % autoSellSeconds;
  }

  getElapsedCycleCount({ autoSellSeconds, deltaSeconds, nowSeconds }) {
    if (
      !Number.isFinite(autoSellSeconds) ||
      autoSellSeconds <= 0 ||
      !Number.isFinite(deltaSeconds) ||
      deltaSeconds <= 0 ||
      !Number.isFinite(nowSeconds)
    ) {
      return 0;
    }

    const previousNowSeconds = Math.max(0, nowSeconds - deltaSeconds);
    const previousCycle = Math.floor(previousNowSeconds / autoSellSeconds);
    const currentCycle = Math.floor(nowSeconds / autoSellSeconds);

    return Math.max(0, currentCycle - previousCycle);
  }

  sellShopCycle(slots) {
    let soldAny = false;
    let blocked = false;

    for (const slot of slots) {
      const result = this.sellSlot(slot);

      if (result.sold) {
        soldAny = true;
      }

      if (result.blocked) {
        blocked = true;
      }
    }

    return { soldAny, blocked };
  }

  processPendingCycles(activeSlots) {
    while (this.pendingCycleCount > 0) {
      const result = this.sellShopCycle(activeSlots);

      if (result.soldAny) {
        this.pendingCycleCount -= 1;
        continue;
      }

      if (result.blocked) {
        return;
      }

      this.pendingCycleCount = 0;
      return;
    }
  }

  sellSlot(slot) {
    const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
    const availableQuantity = this.getAvailableQuantity(slot.sellItemTypeId);

    if (availableQuantity <= 0) {
      return { sold: false, blocked: false };
    }

    const gold = this.shopNpcPriceManager.getNpcBuyPriceGold(item);

    if (!Number.isFinite(gold)) {
      return { sold: false, blocked: this.isPriceDataPending() };
    }

    if (gold <= 0) {
      return { sold: false, blocked: false };
    }

    const npcNeed = this.getNpcNeedForItem(item);

    if (!Number.isFinite(npcNeed)) {
      return { sold: false, blocked: this.isPriceDataPending() };
    }

    if (npcNeed <= 0) {
      return { sold: false, blocked: false };
    }

    const quantity = this.getBulkSellQuantity(slot.sellItemTypeId, {
      availableQuantity,
      npcNeed,
    });

    if (quantity <= 0 || !this.canSellItem(slot.sellItemTypeId, quantity)) {
      return { sold: false, blocked: false };
    }

    const quote = this.quoteSale(item, quantity, gold);

    if (!quote.ok) {
      return {
        sold: false,
        blocked:
          this.isPriceDataPending() &&
          (quote.reason === 'missing_price' || quote.reason === 'missing_need'),
      };
    }

    const soldItem = this.itemsFacade.removeItem(slot.sellItemTypeId, quantity);

    if (!soldItem) {
      return { sold: false, blocked: false };
    }

    const totalGold = quote.totalPriceGold;
    this.goldFacade.add(totalGold);
    void this.shopNpcPriceManager.recordSellToNpc(item, quantity);
    this.onItemSold?.({
      item,
      gold: totalGold,
      quantity,
      slotNumber: slot.slotNumber,
    });
    return { sold: true, blocked: false };
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }

  canSellItem(itemTypeId, quantity) {
    return this.shopSellAvailabilityManager?.canRemoveItem(itemTypeId, quantity) ?? true;
  }

  isPriceDataPending() {
    return this.shopNpcPriceManager?.needsBackendPrices?.() !== false;
  }

  getBulkSellQuantity(itemTypeId, {
    availableQuantity = this.getAvailableQuantity(itemTypeId),
    npcNeed = this.getNpcNeed(itemTypeId),
  } = {}) {
    if (
      !Number.isFinite(availableQuantity) ||
      availableQuantity <= 0 ||
      !Number.isFinite(npcNeed)
    ) {
      return 0;
    }

    return Math.max(0, Math.min(10_000, Math.floor(availableQuantity), npcNeed));
  }

  getAvailableQuantity(itemTypeId) {
    const availableQuantity =
      this.shopSellAvailabilityManager?.getAvailableQuantity?.(itemTypeId) ??
      this.itemsFacade?.getItemQuantity?.(itemTypeId) ??
      0;

    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      return 0;
    }

    return Math.floor(availableQuantity);
  }

  getNpcNeed(itemTypeId) {
    const item = this.itemsFacade.getItemDefinition(itemTypeId);

    return this.getNpcNeedForItem(item);
  }

  getNpcNeedForItem(item) {
    if (typeof this.shopNpcPriceManager.getNpcNeed !== 'function') {
      return 10_000;
    }

    const need = this.shopNpcPriceManager.getNpcNeed?.(item);

    if (!Number.isFinite(need)) {
      return null;
    }

    if (need <= 0) {
      return 0;
    }

    return Math.floor(need);
  }

  quoteSale(item, quantity, fallbackPriceGold) {
    const quote = this.shopNpcSellQuoteManager?.quoteItem?.({
      item,
      quantity,
    });

    if (quote) {
      return quote;
    }

    return {
      ok: true,
      quantity,
      priceGold: fallbackPriceGold,
      totalPriceGold: fallbackPriceGold * quantity,
    };
  }
}

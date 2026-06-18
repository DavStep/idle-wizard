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

    if (activeSlots.length <= 0) {
      this.shopShelfEntityManager.setSellProgressSeconds(progressSeconds);
      return;
    }

    const cycleCount = this.getElapsedCycleCount({
      autoSellSeconds,
      deltaSeconds,
      nowSeconds,
    });

    for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex += 1) {
      const soldAny = this.sellShopCycle(activeSlots);

      if (!soldAny) {
        break;
      }
    }

    this.shopShelfEntityManager.setSellProgressSeconds(progressSeconds);
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

    for (const slot of slots) {
      if (this.sellSlot(slot)) {
        soldAny = true;
      }
    }

    return soldAny;
  }

  sellSlot(slot) {
    const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
    const gold = this.shopNpcPriceManager.getNpcBuyPriceGold(item);

    if (
      !Number.isFinite(gold) ||
      gold <= 0 ||
      this.shopNpcPriceManager.canSellToNpc?.(item) === false
    ) {
      return false;
    }

    const quantity = this.getBulkSellQuantity(slot.sellItemTypeId);

    if (quantity <= 0 || !this.canSellItem(slot.sellItemTypeId, quantity)) {
      return false;
    }

    const quote = this.quoteSale(item, quantity, gold);

    if (!quote.ok) {
      return false;
    }

    const soldItem = this.itemsFacade.removeItem(slot.sellItemTypeId, quantity);

    if (!soldItem) {
      return false;
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
    return true;
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }

  canSellItem(itemTypeId, quantity) {
    return this.shopSellAvailabilityManager?.canRemoveItem(itemTypeId, quantity) ?? true;
  }

  getBulkSellQuantity(itemTypeId) {
    const availableQuantity =
      this.shopSellAvailabilityManager?.getAvailableQuantity?.(itemTypeId) ??
      this.itemsFacade?.getItemQuantity?.(itemTypeId) ??
      0;
    const npcNeed = this.getNpcNeed(itemTypeId);

    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(10_000, Math.floor(availableQuantity), npcNeed));
  }

  getNpcNeed(itemTypeId) {
    const item = this.itemsFacade.getItemDefinition(itemTypeId);

    if (typeof this.shopNpcPriceManager.getNpcNeed !== 'function') {
      return 10_000;
    }

    const need = this.shopNpcPriceManager.getNpcNeed?.(item);

    if (!Number.isFinite(need) || need <= 0) {
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

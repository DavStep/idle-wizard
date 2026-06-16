export class ShopAutoSellManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopBalanceManager,
    shopNpcPriceManager,
    shopSellAvailabilityManager,
    shopShelfEntityManager,
    onItemSold,
  }) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopNpcPriceManager = shopNpcPriceManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.onItemSold = onItemSold;
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
    const slots = this.shopShelfEntityManager.getSlotSnapshots();

    for (const slot of slots) {
      if (!slot.unlocked || !slot.sellItemTypeId) {
        continue;
      }

      const item = this.itemsFacade.getItemDefinition(slot.sellItemTypeId);
      let progressSeconds =
        this.shopShelfEntityManager.getSellProgressSeconds(slot.slotNumber) + deltaSeconds;

      while (progressSeconds >= autoSellSeconds) {
        const gold = this.shopNpcPriceManager.getNpcBuyPriceGold(item);

        if (
          !Number.isFinite(gold) ||
          gold <= 0 ||
          this.shopNpcPriceManager.canSellToNpc?.(item) === false
        ) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const quantity = this.getBulkSellQuantity(slot.sellItemTypeId);

        if (quantity <= 0 || !this.canSellItem(slot.sellItemTypeId, quantity)) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const soldItem = this.itemsFacade.removeItem(slot.sellItemTypeId, quantity);

        if (!soldItem) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const totalGold = gold * quantity;
        this.goldFacade.add(totalGold);
        void this.shopNpcPriceManager.recordSellToNpc(item, quantity);
        this.onItemSold?.({
          item,
          gold: totalGold,
          quantity,
          slotNumber: slot.slotNumber,
        });
        progressSeconds -= autoSellSeconds;
      }

      this.shopShelfEntityManager.setSellProgressSeconds(slot.slotNumber, progressSeconds);
    }
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

    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(10_000, Math.floor(availableQuantity)));
  }
}

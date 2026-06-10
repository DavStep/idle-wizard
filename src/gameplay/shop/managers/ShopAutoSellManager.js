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
        if (!this.canSellItem(slot.sellItemTypeId, 1)) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const soldItem = this.itemsFacade.removeItem(slot.sellItemTypeId, 1);

        if (!soldItem) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const gold = this.shopNpcPriceManager.getNpcBuyPriceGold(item);
        this.goldFacade.add(gold);
        void this.shopNpcPriceManager.recordSellToNpc(item, 1);
        this.onItemSold?.({
          item,
          gold,
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
}

export class ShopAutoSellManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopBalanceManager,
    shopShelfEntityManager,
    onItemSold,
  }) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.onItemSold = onItemSold;
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => this.update(frame.deltaSeconds),
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
        const soldItem = this.itemsFacade.removeItem(slot.sellItemTypeId, 1);

        if (!soldItem) {
          progressSeconds = autoSellSeconds;
          break;
        }

        const gold = this.shopBalanceManager.getSellGold(item.kind, item);
        this.goldFacade.add(gold);
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
}

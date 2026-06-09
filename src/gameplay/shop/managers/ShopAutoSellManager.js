export class ShopAutoSellManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopBalanceManager,
    shopShelfEntityManager,
  }) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
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

        this.goldFacade.add(this.shopBalanceManager.getSellGold(item.kind));
        progressSeconds -= autoSellSeconds;
      }

      this.shopShelfEntityManager.setSellProgressSeconds(slot.slotNumber, progressSeconds);
    }
  }
}

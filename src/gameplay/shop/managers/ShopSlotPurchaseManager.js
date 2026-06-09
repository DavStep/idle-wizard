export class ShopSlotPurchaseManager {
  constructor({ goldFacade, shopBalanceManager, shopShelfEntityManager }) {
    this.goldFacade = goldFacade;
    this.shopBalanceManager = shopBalanceManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
  }

  buyNextSlot() {
    const nextSlotNumber = this.shopShelfEntityManager.getUnlockedSlots() + 1;
    const cost = this.shopBalanceManager.getSlotCost(nextSlotNumber);

    if (cost === null) {
      return {
        ok: false,
        reason: 'max_slots',
      };
    }

    if (!this.goldFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost,
        slotNumber: nextSlotNumber,
      };
    }

    this.shopShelfEntityManager.unlockNextSlot();

    return {
      ok: true,
      cost,
      slotNumber: nextSlotNumber,
    };
  }
}

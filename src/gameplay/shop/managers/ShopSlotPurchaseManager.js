export class ShopSlotPurchaseManager {
  constructor({
    coinFacade,
    playerLevelFacade,
    getMaxSlotsByLevel,
    getRequiredLevelForSlot,
    shopBalanceManager,
    shopShelfEntityManager,
  }) {
    this.coinFacade = coinFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.getConfiguredMaxSlotsByLevel = getMaxSlotsByLevel;
    this.getRequiredLevelForSlot = getRequiredLevelForSlot;
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

    if (nextSlotNumber > this.getMaxSlotsByLevel()) {
      return {
        ok: false,
        reason: 'level_locked',
        requiredLevel:
          this.getRequiredLevelForSlot?.(nextSlotNumber) ??
          this.playerLevelFacade?.getRequiredLevelForShopSlot(nextSlotNumber) ??
          null,
        slotNumber: nextSlotNumber,
      };
    }

    if (!this.coinFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_coin',
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

  getMaxSlotsByLevel() {
    return (
      this.getConfiguredMaxSlotsByLevel?.() ??
      this.playerLevelFacade?.getMaxShopSlots?.() ??
      this.shopBalanceManager.getMaxShelfSlots()
    );
  }
}

const DEFAULT_SHOP_BALANCE = {
  shopShelf: {
    initialUnlockedSlots: 1,
    slotCostsGold: [0, 50, 150, 400, 1000],
    autoSellSeconds: 5,
  },
};

const MAX_SHELF_SLOTS = 5;

export class ShopBalanceManager {
  constructor({ balance = DEFAULT_SHOP_BALANCE } = {}) {
    this.setBalance(balance);
  }

  setRuntimeBalance(balance) {
    this.setBalance(balance);
  }

  setBalance(balance) {
    this.balance = balance;
    this.slotCostsGold = this.readSlotCostsGold();
    this.initialUnlockedSlots = this.readInitialUnlockedSlots();
    this.autoSellSeconds = this.readAutoSellSeconds();
  }

  getMaxShelfSlots() {
    return this.slotCostsGold.length;
  }

  getInitialUnlockedSlots() {
    return this.initialUnlockedSlots;
  }

  getSlotCost(slotNumber) {
    return this.slotCostsGold[slotNumber - 1] ?? null;
  }

  getSlotCosts() {
    return [...this.slotCostsGold];
  }

  getAutoSellSeconds() {
    return this.autoSellSeconds;
  }

  readSlotCostsGold() {
    const slotCosts = this.balance?.shopShelf?.slotCostsGold;

    if (!Array.isArray(slotCosts)) {
      throw new Error('game_config.shop requires shopShelf.slotCostsGold.');
    }

    if (slotCosts.length > MAX_SHELF_SLOTS) {
      throw new Error('NPC market can have at most 5 stands.');
    }

    if (slotCosts.some((cost) => !Number.isFinite(cost) || cost < 0)) {
      throw new Error('game_config.shop slot costs must be zero or positive numbers.');
    }

    return [...slotCosts];
  }

  readInitialUnlockedSlots() {
    const initialUnlockedSlots = this.balance?.shopShelf?.initialUnlockedSlots ?? 0;

    if (
      !Number.isInteger(initialUnlockedSlots) ||
      initialUnlockedSlots < 0 ||
      initialUnlockedSlots > this.getMaxShelfSlots()
    ) {
      throw new Error('game_config.shop initial unlocked slots must fit market stands.');
    }

    return initialUnlockedSlots;
  }

  readAutoSellSeconds() {
    const autoSellSeconds = this.balance?.shopShelf?.autoSellSeconds;

    if (!Number.isFinite(autoSellSeconds) || autoSellSeconds <= 0) {
      throw new Error('game_config.shop requires positive shopShelf.autoSellSeconds.');
    }

    return autoSellSeconds;
  }

}

import shopBalance from '../shop-balance.json';

const MAX_SHELF_SLOTS = 5;

export class ShopBalanceManager {
  constructor({ balance = shopBalance } = {}) {
    this.balance = balance;
    this.slotCostsGold = this.readSlotCostsGold();
    this.initialUnlockedSlots = this.readInitialUnlockedSlots();
    this.autoSellSeconds = this.readAutoSellSeconds();
    this.sellGoldByKind = this.readSellGoldByKind();
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

  getSellGold(kind, item = null) {
    return item?.baseSellPrice ?? this.sellGoldByKind[kind] ?? 0;
  }

  readSlotCostsGold() {
    const slotCosts = this.balance?.shopShelf?.slotCostsGold;

    if (!Array.isArray(slotCosts)) {
      throw new Error('shop-balance.json requires shopShelf.slotCostsGold.');
    }

    if (slotCosts.length > MAX_SHELF_SLOTS) {
      throw new Error('shop shelf can have at most 5 slots.');
    }

    if (slotCosts.some((cost) => !Number.isFinite(cost) || cost < 0)) {
      throw new Error('shop-balance.json slot costs must be zero or positive numbers.');
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
      throw new Error('shop-balance.json initial unlocked slots must fit shelf slots.');
    }

    return initialUnlockedSlots;
  }

  readAutoSellSeconds() {
    const autoSellSeconds = this.balance?.shopShelf?.autoSellSeconds;

    if (!Number.isFinite(autoSellSeconds) || autoSellSeconds <= 0) {
      throw new Error('shop-balance.json requires positive shopShelf.autoSellSeconds.');
    }

    return autoSellSeconds;
  }

  readSellGoldByKind() {
    const sellGoldByKind = this.balance?.shopShelf?.sellGoldByKind;

    if (!sellGoldByKind || typeof sellGoldByKind !== 'object') {
      throw new Error('shop-balance.json requires shopShelf.sellGoldByKind.');
    }

    for (const amount of Object.values(sellGoldByKind)) {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('shop-balance.json sell gold values must be positive numbers.');
      }
    }

    return { ...sellGoldByKind };
  }
}

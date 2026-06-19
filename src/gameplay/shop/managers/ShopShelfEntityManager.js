import {
  ShopShelf,
  ShopShelfSlot,
  shopSellLimitModeNames,
  shopSellLimitModes,
} from '../components/ShopComponents.js';

export class ShopShelfEntityManager {
  constructor({ initialUnlockedSlots = 0, maxSlots }) {
    this.initialUnlockedSlots = initialUnlockedSlots;
    this.maxSlots = maxSlots;
    this.entityId = null;
    this.slotEntityIds = [];
    this.ecsManagers = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.ecsManagers = ecsManagers;
    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, ShopShelf);
    ShopShelf.selectedSlotNumber[this.entityId] = this.initialUnlockedSlots > 0 ? 1 : 0;
    ShopShelf.sellProgressSeconds[this.entityId] = 0;

    for (let slotNumber = 1; slotNumber <= this.maxSlots; slotNumber += 1) {
      this.createSlotEntity(slotNumber);
    }
  }

  configureCapacity({ initialUnlockedSlots = this.initialUnlockedSlots, maxSlots = this.maxSlots } = {}) {
    this.initialUnlockedSlots = initialUnlockedSlots;
    this.maxSlots = maxSlots;

    if (this.entityId === null) {
      return;
    }

    for (let slotNumber = this.slotEntityIds.length + 1; slotNumber <= this.maxSlots; slotNumber += 1) {
      this.createSlotEntity(slotNumber);
    }

    const selectedSlotNumber = ShopShelf.selectedSlotNumber[this.entityId] || 0;
    if (selectedSlotNumber > this.maxSlots) {
      ShopShelf.selectedSlotNumber[this.entityId] = this.getUnlockedSlots() > 0 ? 1 : 0;
    }
  }

  createSlotEntity(slotNumber) {
    const slotEntityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(slotEntityId, ShopShelfSlot);
    ShopShelfSlot.slotNumber[slotEntityId] = slotNumber;
    ShopShelfSlot.isUnlocked[slotEntityId] = slotNumber <= this.initialUnlockedSlots ? 1 : 0;
    ShopShelfSlot.sellItemTypeId[slotEntityId] = 0;
    ShopShelfSlot.sellLimitMode[slotEntityId] = shopSellLimitModes.all;
    ShopShelfSlot.sellQuantityLimit[slotEntityId] = 0;
    ShopShelfSlot.sellProgressSeconds[slotEntityId] = 0;
    this.slotEntityIds.push(slotEntityId);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Shop shelf entity has not been initialized.');
    }

    return this.entityId;
  }

  getUnlockedSlots() {
    return this.getActiveSlotEntityIds().filter((slotEntityId) => ShopShelfSlot.isUnlocked[slotEntityId] === 1)
      .length;
  }

  getSelectedSlotNumber() {
    return ShopShelf.selectedSlotNumber[this.getEntityId()] || null;
  }

  unlockNextSlot() {
    const nextSlotEntityId = this.getActiveSlotEntityIds().find(
      (slotEntityId) => ShopShelfSlot.isUnlocked[slotEntityId] !== 1,
    );

    if (nextSlotEntityId === undefined) {
      return false;
    }

    ShopShelfSlot.isUnlocked[nextSlotEntityId] = 1;

    if (!this.getSelectedSlotNumber()) {
      ShopShelf.selectedSlotNumber[this.getEntityId()] = ShopShelfSlot.slotNumber[nextSlotEntityId];
    }

    return true;
  }

  selectSlot(slotNumber) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    ShopShelf.selectedSlotNumber[this.getEntityId()] = slotNumber;
    return true;
  }

  assignSlotSellItem(slotNumber, itemTypeId, sellLimit = {}) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    const safeItemTypeId = Number.isInteger(itemTypeId) && itemTypeId > 0 ? itemTypeId : 0;
    const normalizedLimit = this.normalizeSellLimit({
      itemTypeId: safeItemTypeId,
      ...sellLimit,
    });
    ShopShelfSlot.sellItemTypeId[slotEntityId] = safeItemTypeId;
    ShopShelfSlot.sellLimitMode[slotEntityId] = normalizedLimit.sellLimitMode;
    ShopShelfSlot.sellQuantityLimit[slotEntityId] = normalizedLimit.sellQuantityLimit;
    return true;
  }

  clearSlotSellItem(slotNumber) {
    return this.assignSlotSellItem(slotNumber, 0);
  }

  consumeSlotSellQuantityLimit(slotNumber, quantity) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return null;
    }

    const safeQuantity = Math.max(0, Math.floor(Number(quantity)));
    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return null;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    if (ShopShelfSlot.sellLimitMode[slotEntityId] !== shopSellLimitModes.amount) {
      return null;
    }

    const currentQuantity = Math.max(
      0,
      Math.floor(Number(ShopShelfSlot.sellQuantityLimit[slotEntityId]) || 0),
    );
    const nextQuantity = Math.max(0, currentQuantity - safeQuantity);
    ShopShelfSlot.sellQuantityLimit[slotEntityId] = nextQuantity;
    return nextQuantity;
  }

  isSlotUnlocked(slotNumber) {
    return ShopShelfSlot.isUnlocked[this.getSlotEntityId(slotNumber)] === 1;
  }

  getSellProgressSeconds() {
    return ShopShelf.sellProgressSeconds[this.getEntityId()] ?? 0;
  }

  setSellProgressSeconds(seconds) {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    ShopShelf.sellProgressSeconds[this.getEntityId()] = safeSeconds;

    for (const slotEntityId of this.getActiveSlotEntityIds()) {
      ShopShelfSlot.sellProgressSeconds[slotEntityId] =
        ShopShelfSlot.isUnlocked[slotEntityId] === 1 ? safeSeconds : 0;
    }
  }

  applySnapshot({ unlockedSlots, selectedSlotNumber, sellProgressSeconds, slots = [] } = {}) {
    const safeUnlockedSlots = Number.isInteger(unlockedSlots)
      ? Math.max(this.initialUnlockedSlots, Math.min(unlockedSlots, this.maxSlots))
      : this.initialUnlockedSlots;
    const safeSellProgressSeconds = Number.isFinite(sellProgressSeconds)
      ? Math.max(0, sellProgressSeconds)
      : this.getLegacySellProgressSeconds(slots, safeUnlockedSlots);

    for (const slotEntityId of this.getActiveSlotEntityIds()) {
      const slotNumber = ShopShelfSlot.slotNumber[slotEntityId];
      const slot = slots.find((candidate) => candidate?.slotNumber === slotNumber);
      const isUnlocked = slotNumber <= safeUnlockedSlots;
      const sellItemTypeId = isUnlocked ? slot?.sellItemTypeId || 0 : 0;
      const normalizedLimit = this.normalizeSellLimit({
        itemTypeId: sellItemTypeId,
        sellLimitMode: slot?.sellLimitMode,
        sellQuantityLimit: slot?.sellQuantityLimit,
      });

      ShopShelfSlot.isUnlocked[slotEntityId] = isUnlocked ? 1 : 0;
      ShopShelfSlot.sellItemTypeId[slotEntityId] = sellItemTypeId;
      ShopShelfSlot.sellLimitMode[slotEntityId] = normalizedLimit.sellLimitMode;
      ShopShelfSlot.sellQuantityLimit[slotEntityId] = normalizedLimit.sellQuantityLimit;
      ShopShelfSlot.sellProgressSeconds[slotEntityId] = isUnlocked ? safeSellProgressSeconds : 0;
    }
    ShopShelf.sellProgressSeconds[this.getEntityId()] = safeSellProgressSeconds;

    const selectedIsValid =
      Number.isInteger(selectedSlotNumber) &&
      selectedSlotNumber >= 1 &&
      selectedSlotNumber <= safeUnlockedSlots;
    ShopShelf.selectedSlotNumber[this.getEntityId()] = selectedIsValid
      ? selectedSlotNumber
      : safeUnlockedSlots > 0
        ? 1
        : 0;
  }

  getSlotEntityId(slotNumber) {
    const slotEntityId = this.getActiveSlotEntityIds().find(
      (entityId) => ShopShelfSlot.slotNumber[entityId] === slotNumber,
    );

    if (slotEntityId === undefined) {
      throw new Error(`Unknown NPC market stand: ${slotNumber}`);
    }

    return slotEntityId;
  }

  getSlotSnapshots() {
    const sellProgressSeconds = this.getSellProgressSeconds();

    return this.getActiveSlotEntityIds().map((slotEntityId) => ({
      slotNumber: ShopShelfSlot.slotNumber[slotEntityId],
      unlocked: ShopShelfSlot.isUnlocked[slotEntityId] === 1,
      sellItemTypeId: ShopShelfSlot.sellItemTypeId[slotEntityId] || null,
      sellLimitMode: this.getSellLimitModeName(ShopShelfSlot.sellLimitMode[slotEntityId]),
      sellQuantityLimit:
        ShopShelfSlot.sellLimitMode[slotEntityId] === shopSellLimitModes.amount
          ? Math.max(0, Math.floor(Number(ShopShelfSlot.sellQuantityLimit[slotEntityId]) || 0))
          : null,
      sellProgressSeconds: ShopShelfSlot.isUnlocked[slotEntityId] === 1 ? sellProgressSeconds : 0,
    }));
  }

  normalizeSellLimit({ itemTypeId, sellLimitMode, sellQuantityLimit } = {}) {
    if (!Number.isInteger(itemTypeId) || itemTypeId <= 0) {
      return {
        sellLimitMode: shopSellLimitModes.all,
        sellQuantityLimit: 0,
      };
    }

    const mode =
      sellLimitMode === shopSellLimitModes.amount || sellLimitMode === 'amount'
        ? shopSellLimitModes.amount
        : shopSellLimitModes.all;

    if (mode !== shopSellLimitModes.amount) {
      return {
        sellLimitMode: shopSellLimitModes.all,
        sellQuantityLimit: 0,
      };
    }

    const quantity = Math.max(0, Math.floor(Number(sellQuantityLimit) || 0));
    return {
      sellLimitMode: shopSellLimitModes.amount,
      sellQuantityLimit: quantity,
    };
  }

  getSellLimitModeName(mode) {
    return shopSellLimitModeNames[mode] ?? 'all';
  }

  getLegacySellProgressSeconds(slots = [], unlockedSlots = this.getUnlockedSlots()) {
    return Math.max(
      0,
      ...slots
        .filter((slot) => Number.isInteger(slot?.slotNumber) && slot.slotNumber <= unlockedSlots)
        .map((slot) =>
          Number.isFinite(slot?.sellProgressSeconds)
            ? Math.max(0, slot.sellProgressSeconds)
            : 0,
        ),
    );
  }

  getActiveSlotEntityIds() {
    return this.slotEntityIds.filter((slotEntityId) => ShopShelfSlot.slotNumber[slotEntityId] <= this.maxSlots);
  }
}

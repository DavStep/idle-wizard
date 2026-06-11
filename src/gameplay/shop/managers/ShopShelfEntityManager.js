import { ShopShelf, ShopShelfSlot } from '../components/ShopComponents.js';

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

  assignSlotSellItem(slotNumber, itemTypeId) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    ShopShelfSlot.sellItemTypeId[slotEntityId] = itemTypeId;
    ShopShelfSlot.sellProgressSeconds[slotEntityId] = 0;
    return true;
  }

  clearSlotSellItem(slotNumber) {
    return this.assignSlotSellItem(slotNumber, 0);
  }

  isSlotUnlocked(slotNumber) {
    return ShopShelfSlot.isUnlocked[this.getSlotEntityId(slotNumber)] === 1;
  }

  getSellProgressSeconds(slotNumber) {
    return ShopShelfSlot.sellProgressSeconds[this.getSlotEntityId(slotNumber)] ?? 0;
  }

  setSellProgressSeconds(slotNumber, seconds) {
    ShopShelfSlot.sellProgressSeconds[this.getSlotEntityId(slotNumber)] = Math.max(0, seconds);
  }

  applySnapshot({ unlockedSlots, selectedSlotNumber, slots = [] } = {}) {
    const safeUnlockedSlots = Number.isInteger(unlockedSlots)
      ? Math.max(this.initialUnlockedSlots, Math.min(unlockedSlots, this.maxSlots))
      : this.initialUnlockedSlots;

    for (const slotEntityId of this.getActiveSlotEntityIds()) {
      const slotNumber = ShopShelfSlot.slotNumber[slotEntityId];
      const slot = slots.find((candidate) => candidate?.slotNumber === slotNumber);
      const isUnlocked = slotNumber <= safeUnlockedSlots;

      ShopShelfSlot.isUnlocked[slotEntityId] = isUnlocked ? 1 : 0;
      ShopShelfSlot.sellItemTypeId[slotEntityId] = isUnlocked ? slot?.sellItemTypeId || 0 : 0;
      ShopShelfSlot.sellProgressSeconds[slotEntityId] =
        isUnlocked && Number.isFinite(slot?.sellProgressSeconds)
          ? Math.max(0, slot.sellProgressSeconds)
          : 0;
    }

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
    return this.getActiveSlotEntityIds().map((slotEntityId) => ({
      slotNumber: ShopShelfSlot.slotNumber[slotEntityId],
      unlocked: ShopShelfSlot.isUnlocked[slotEntityId] === 1,
      sellItemTypeId: ShopShelfSlot.sellItemTypeId[slotEntityId] || null,
      sellProgressSeconds: ShopShelfSlot.sellProgressSeconds[slotEntityId] ?? 0,
    }));
  }

  getActiveSlotEntityIds() {
    return this.slotEntityIds.filter((slotEntityId) => ShopShelfSlot.slotNumber[slotEntityId] <= this.maxSlots);
  }
}

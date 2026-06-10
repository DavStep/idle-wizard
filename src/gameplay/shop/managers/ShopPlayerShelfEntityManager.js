import { PlayerShopShelf, PlayerShopShelfSlot } from '../components/ShopComponents.js';

export class ShopPlayerShelfEntityManager {
  constructor({ initialUnlockedSlots = 0, maxSlots }) {
    this.initialUnlockedSlots = initialUnlockedSlots;
    this.maxSlots = maxSlots;
    this.entityId = null;
    this.slotEntityIds = [];
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerShopShelf);
    PlayerShopShelf.selectedSlotNumber[this.entityId] = this.initialUnlockedSlots > 0 ? 1 : 0;

    for (let slotNumber = 1; slotNumber <= this.maxSlots; slotNumber += 1) {
      const slotEntityId = ecsManagers.entities.createEntity();
      ecsManagers.components.add(slotEntityId, PlayerShopShelfSlot);
      PlayerShopShelfSlot.slotNumber[slotEntityId] = slotNumber;
      PlayerShopShelfSlot.isUnlocked[slotEntityId] = slotNumber <= this.initialUnlockedSlots ? 1 : 0;
      PlayerShopShelfSlot.itemTypeId[slotEntityId] = 0;
      PlayerShopShelfSlot.quantity[slotEntityId] = 0;
      PlayerShopShelfSlot.priceGold[slotEntityId] = 0;
      this.slotEntityIds.push(slotEntityId);
    }
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Player market stand entity has not been initialized.');
    }

    return this.entityId;
  }

  getUnlockedSlots() {
    return this.slotEntityIds.filter(
      (slotEntityId) => PlayerShopShelfSlot.isUnlocked[slotEntityId] === 1,
    ).length;
  }

  getSelectedSlotNumber() {
    return PlayerShopShelf.selectedSlotNumber[this.getEntityId()] || null;
  }

  unlockNextSlot() {
    const nextSlotEntityId = this.slotEntityIds.find(
      (slotEntityId) => PlayerShopShelfSlot.isUnlocked[slotEntityId] !== 1,
    );

    if (nextSlotEntityId === undefined) {
      return false;
    }

    PlayerShopShelfSlot.isUnlocked[nextSlotEntityId] = 1;

    if (!this.getSelectedSlotNumber()) {
      PlayerShopShelf.selectedSlotNumber[this.getEntityId()] =
        PlayerShopShelfSlot.slotNumber[nextSlotEntityId];
    }

    return true;
  }

  selectSlot(slotNumber) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    PlayerShopShelf.selectedSlotNumber[this.getEntityId()] = slotNumber;
    return true;
  }

  assignSlotListing(slotNumber, { itemTypeId, quantity, priceGold }) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    PlayerShopShelfSlot.itemTypeId[slotEntityId] = itemTypeId;
    PlayerShopShelfSlot.quantity[slotEntityId] = quantity;
    PlayerShopShelfSlot.priceGold[slotEntityId] = priceGold;
    return true;
  }

  clearSlotListing(slotNumber) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    PlayerShopShelfSlot.itemTypeId[slotEntityId] = 0;
    PlayerShopShelfSlot.quantity[slotEntityId] = 0;
    PlayerShopShelfSlot.priceGold[slotEntityId] = 0;
    return true;
  }

  setSlotQuantityFromMarket(slotNumber, quantity) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    if (quantity <= 0) {
      return this.clearSlotListing(slotNumber);
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);

    if (!PlayerShopShelfSlot.itemTypeId[slotEntityId]) {
      return false;
    }

    PlayerShopShelfSlot.quantity[slotEntityId] = Math.floor(quantity);
    return true;
  }

  isSlotUnlocked(slotNumber) {
    return PlayerShopShelfSlot.isUnlocked[this.getSlotEntityId(slotNumber)] === 1;
  }

  applySnapshot({ unlockedSlots, selectedSlotNumber, slots = [] } = {}) {
    const safeUnlockedSlots = Number.isInteger(unlockedSlots)
      ? Math.max(this.initialUnlockedSlots, Math.min(unlockedSlots, this.maxSlots))
      : this.initialUnlockedSlots;

    for (const slotEntityId of this.slotEntityIds) {
      const slotNumber = PlayerShopShelfSlot.slotNumber[slotEntityId];
      const slot = slots.find((candidate) => candidate?.slotNumber === slotNumber);
      const isUnlocked = slotNumber <= safeUnlockedSlots;
      const quantity = Number.isFinite(slot?.quantity) ? Math.max(0, Math.floor(slot.quantity)) : 0;
      const priceGold = Number.isFinite(slot?.priceGold)
        ? Math.max(0, Math.floor(slot.priceGold))
        : 0;

      PlayerShopShelfSlot.isUnlocked[slotEntityId] = isUnlocked ? 1 : 0;
      PlayerShopShelfSlot.itemTypeId[slotEntityId] =
        isUnlocked && quantity > 0 && priceGold > 0 ? slot?.itemTypeId || 0 : 0;
      PlayerShopShelfSlot.quantity[slotEntityId] =
        isUnlocked && PlayerShopShelfSlot.itemTypeId[slotEntityId] ? quantity : 0;
      PlayerShopShelfSlot.priceGold[slotEntityId] =
        isUnlocked && PlayerShopShelfSlot.itemTypeId[slotEntityId] ? priceGold : 0;
    }

    const selectedIsValid =
      Number.isInteger(selectedSlotNumber) &&
      selectedSlotNumber >= 1 &&
      selectedSlotNumber <= safeUnlockedSlots;
    PlayerShopShelf.selectedSlotNumber[this.getEntityId()] = selectedIsValid
      ? selectedSlotNumber
      : safeUnlockedSlots > 0
        ? 1
        : 0;
  }

  getSlotEntityId(slotNumber) {
    const slotEntityId = this.slotEntityIds.find(
      (entityId) => PlayerShopShelfSlot.slotNumber[entityId] === slotNumber,
    );

    if (slotEntityId === undefined) {
      throw new Error(`Unknown player market stand: ${slotNumber}`);
    }

    return slotEntityId;
  }

  getSlotSnapshots() {
    return this.slotEntityIds.map((slotEntityId) => ({
      slotNumber: PlayerShopShelfSlot.slotNumber[slotEntityId],
      unlocked: PlayerShopShelfSlot.isUnlocked[slotEntityId] === 1,
      itemTypeId: PlayerShopShelfSlot.itemTypeId[slotEntityId] || null,
      quantity: PlayerShopShelfSlot.quantity[slotEntityId] || 0,
      priceGold: PlayerShopShelfSlot.priceGold[slotEntityId] || 0,
    }));
  }
}

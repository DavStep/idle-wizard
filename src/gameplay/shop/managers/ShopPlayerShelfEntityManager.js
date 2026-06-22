import { PlayerShopShelf, PlayerShopShelfSlot } from '../components/ShopComponents.js';
import { normalizeCoinPrice } from '../../../shared/coinPrice.js';

export class ShopPlayerShelfEntityManager {
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
    ecsManagers.components.add(this.entityId, PlayerShopShelf);
    PlayerShopShelf.selectedSlotNumber[this.entityId] = this.initialUnlockedSlots > 0 ? 1 : 0;

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

    const selectedSlotNumber = PlayerShopShelf.selectedSlotNumber[this.entityId] || 0;
    if (selectedSlotNumber > this.maxSlots) {
      PlayerShopShelf.selectedSlotNumber[this.entityId] = this.getUnlockedSlots() > 0 ? 1 : 0;
    }
  }

  createSlotEntity(slotNumber) {
    const slotEntityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(slotEntityId, PlayerShopShelfSlot);
    PlayerShopShelfSlot.slotNumber[slotEntityId] = slotNumber;
    PlayerShopShelfSlot.isUnlocked[slotEntityId] = slotNumber <= this.initialUnlockedSlots ? 1 : 0;
    PlayerShopShelfSlot.itemTypeId[slotEntityId] = 0;
    PlayerShopShelfSlot.quantity[slotEntityId] = 0;
    PlayerShopShelfSlot.priceCoin[slotEntityId] = 0;
    this.slotEntityIds.push(slotEntityId);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Player market stand entity has not been initialized.');
    }

    return this.entityId;
  }

  getUnlockedSlots() {
    return this.getActiveSlotEntityIds().filter(
      (slotEntityId) => PlayerShopShelfSlot.isUnlocked[slotEntityId] === 1,
    ).length;
  }

  getSelectedSlotNumber() {
    return PlayerShopShelf.selectedSlotNumber[this.getEntityId()] || null;
  }

  unlockNextSlot() {
    const nextSlotEntityId = this.getActiveSlotEntityIds().find(
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

  assignSlotListing(slotNumber, { itemTypeId, quantity, priceCoin }) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    const safePriceCoin = normalizeCoinPrice(priceCoin) ?? 0;
    PlayerShopShelfSlot.itemTypeId[slotEntityId] = itemTypeId;
    PlayerShopShelfSlot.quantity[slotEntityId] = quantity;
    PlayerShopShelfSlot.priceCoin[slotEntityId] = safePriceCoin;
    return true;
  }

  clearSlotListing(slotNumber) {
    if (!this.isSlotUnlocked(slotNumber)) {
      return false;
    }

    const slotEntityId = this.getSlotEntityId(slotNumber);
    PlayerShopShelfSlot.itemTypeId[slotEntityId] = 0;
    PlayerShopShelfSlot.quantity[slotEntityId] = 0;
    PlayerShopShelfSlot.priceCoin[slotEntityId] = 0;
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

    for (const slotEntityId of this.getActiveSlotEntityIds()) {
      const slotNumber = PlayerShopShelfSlot.slotNumber[slotEntityId];
      const slot = slots.find((candidate) => candidate?.slotNumber === slotNumber);
      const isUnlocked = slotNumber <= safeUnlockedSlots;
      const quantity = Number.isFinite(slot?.quantity) ? Math.max(0, Math.floor(slot.quantity)) : 0;
      const priceCoin = normalizeCoinPrice(slot?.priceCoin) ?? 0;

      PlayerShopShelfSlot.isUnlocked[slotEntityId] = isUnlocked ? 1 : 0;
      PlayerShopShelfSlot.itemTypeId[slotEntityId] =
        isUnlocked && quantity > 0 && priceCoin > 0 ? slot?.itemTypeId || 0 : 0;
      PlayerShopShelfSlot.quantity[slotEntityId] =
        isUnlocked && PlayerShopShelfSlot.itemTypeId[slotEntityId] ? quantity : 0;
      PlayerShopShelfSlot.priceCoin[slotEntityId] =
        isUnlocked && PlayerShopShelfSlot.itemTypeId[slotEntityId] ? priceCoin : 0;
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
    const slotEntityId = this.getActiveSlotEntityIds().find(
      (entityId) => PlayerShopShelfSlot.slotNumber[entityId] === slotNumber,
    );

    if (slotEntityId === undefined) {
      throw new Error(`Unknown player market stand: ${slotNumber}`);
    }

    return slotEntityId;
  }

  getSlotSnapshots() {
    return this.getActiveSlotEntityIds().map((slotEntityId) => ({
      slotNumber: PlayerShopShelfSlot.slotNumber[slotEntityId],
      unlocked: PlayerShopShelfSlot.isUnlocked[slotEntityId] === 1,
      itemTypeId: PlayerShopShelfSlot.itemTypeId[slotEntityId] || null,
      quantity: PlayerShopShelfSlot.quantity[slotEntityId] || 0,
      priceCoin: PlayerShopShelfSlot.priceCoin[slotEntityId] || 0,
    }));
  }

  getActiveSlotEntityIds() {
    return this.slotEntityIds.filter((slotEntityId) => PlayerShopShelfSlot.slotNumber[slotEntityId] <= this.maxSlots);
  }
}

import { normalizeGoldPrice } from '../../../shared/goldPrice.js';
import { PlayerShopRequestSlot } from '../components/ShopComponents.js';

export class ShopPlayerRequestEntityManager {
  constructor({ maxSlots }) {
    this.maxSlots = maxSlots;
    this.slotEntityIds = [];
    this.ecsManagers = null;
  }

  initialize(ecsManagers) {
    if (this.ecsManagers) {
      return;
    }

    this.ecsManagers = ecsManagers;

    for (let slotNumber = 1; slotNumber <= this.maxSlots; slotNumber += 1) {
      this.createSlotEntity(slotNumber);
    }
  }

  configureCapacity({ maxSlots = this.maxSlots } = {}) {
    this.maxSlots = maxSlots;

    if (!this.ecsManagers) {
      return;
    }

    for (
      let slotNumber = this.slotEntityIds.length + 1;
      slotNumber <= this.maxSlots;
      slotNumber += 1
    ) {
      this.createSlotEntity(slotNumber);
    }
  }

  createSlotEntity(slotNumber) {
    const slotEntityId = this.ecsManagers.entities.createEntity();
    this.ecsManagers.components.add(slotEntityId, PlayerShopRequestSlot);
    PlayerShopRequestSlot.slotNumber[slotEntityId] = slotNumber;
    PlayerShopRequestSlot.itemTypeId[slotEntityId] = 0;
    PlayerShopRequestSlot.quantity[slotEntityId] = 0;
    PlayerShopRequestSlot.priceGold[slotEntityId] = 0;
    this.slotEntityIds.push(slotEntityId);
  }

  setRequest(slotNumber, { itemTypeId, quantity, priceGold }) {
    const slotEntityId = this.getSlotEntityId(slotNumber);
    const safeQuantity = Math.floor(Number(quantity));
    const safePriceGold = normalizeGoldPrice(priceGold) ?? 0;

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0 || safePriceGold <= 0) {
      return false;
    }

    PlayerShopRequestSlot.itemTypeId[slotEntityId] = itemTypeId;
    PlayerShopRequestSlot.quantity[slotEntityId] = safeQuantity;
    PlayerShopRequestSlot.priceGold[slotEntityId] = safePriceGold;
    return true;
  }

  clearRequest(slotNumber) {
    const slotEntityId = this.getSlotEntityId(slotNumber);
    PlayerShopRequestSlot.itemTypeId[slotEntityId] = 0;
    PlayerShopRequestSlot.quantity[slotEntityId] = 0;
    PlayerShopRequestSlot.priceGold[slotEntityId] = 0;
    return true;
  }

  applySnapshot({ unlockedSlots = 0, slots = [] } = {}) {
    for (const slotEntityId of this.getActiveSlotEntityIds()) {
      const slotNumber = PlayerShopRequestSlot.slotNumber[slotEntityId];
      const slot = slots.find((candidate) => candidate?.slotNumber === slotNumber);
      const quantity = Number.isFinite(slot?.quantity)
        ? Math.max(0, Math.floor(slot.quantity))
        : 0;
      const priceGold = normalizeGoldPrice(slot?.priceGold) ?? 0;
      const hasRequest = slotNumber <= unlockedSlots && slot?.itemTypeId && quantity > 0 && priceGold > 0;

      PlayerShopRequestSlot.itemTypeId[slotEntityId] = hasRequest ? slot.itemTypeId : 0;
      PlayerShopRequestSlot.quantity[slotEntityId] = hasRequest ? quantity : 0;
      PlayerShopRequestSlot.priceGold[slotEntityId] = hasRequest ? priceGold : 0;
    }
  }

  getSlotEntityId(slotNumber) {
    const slotEntityId = this.getActiveSlotEntityIds().find(
      (entityId) => PlayerShopRequestSlot.slotNumber[entityId] === slotNumber,
    );

    if (slotEntityId === undefined) {
      throw new Error(`Unknown player market request: ${slotNumber}`);
    }

    return slotEntityId;
  }

  getSlotSnapshots() {
    return this.getActiveSlotEntityIds().map((slotEntityId) => ({
      slotNumber: PlayerShopRequestSlot.slotNumber[slotEntityId],
      itemTypeId: PlayerShopRequestSlot.itemTypeId[slotEntityId] || null,
      quantity: PlayerShopRequestSlot.quantity[slotEntityId] || 0,
      priceGold: PlayerShopRequestSlot.priceGold[slotEntityId] || 0,
    }));
  }

  getActiveSlotEntityIds() {
    return this.slotEntityIds.filter(
      (slotEntityId) => PlayerShopRequestSlot.slotNumber[slotEntityId] <= this.maxSlots,
    );
  }
}

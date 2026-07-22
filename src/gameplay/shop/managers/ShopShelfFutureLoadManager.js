import { MAX_STALL_LOADED_QUANTITY } from './ShopShelfSlotSelectionManager.js';

export class ShopShelfFutureLoadManager {
  constructor({
    itemsFacade,
    shopSellKindManager,
    shopShelfEntityManager,
    shopShelfSlotSelectionManager,
    shopSellAvailabilityManager,
    getItemAccess,
  } = {}) {
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.shopShelfSlotSelectionManager = shopShelfSlotSelectionManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.getItemAccess = getItemAccess;
    this.unsubscribe = null;
    this.registered = false;
  }

  initialize(systemManager) {
    this.unsubscribe ??= this.itemsFacade?.subscribeProducedItems?.((production) =>
      this.handleProducedItem(production),
    );
    if (this.registered) return;
    systemManager.register({ update: () => this.flushPendingItems() });
    this.registered = true;
  }

  setSelectedFutureItem(itemTypeId, enabled) {
    const slotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();
    if (!slotNumber) return { ok: false, reason: 'no_selected_slot' };

    const slot = this.getSlot(slotNumber);
    if (!enabled) {
      this.shopShelfEntityManager.setSlotFutureItem(slotNumber, 0);
      return { ok: true, enabled: false, slotNumber, itemTypeId: null };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);
    const marketAccess = this.getItemAccess?.(item);
    if (marketAccess && !marketAccess.tradedHere) {
      return { ok: false, reason: 'market_locked', itemTypeId };
    }
    if (!this.shopSellKindManager.isSellKind(item.kind)) {
      return { ok: false, reason: 'item_not_sellable', itemTypeId };
    }
    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded', itemTypeId };
    }

    for (const candidate of this.shopShelfEntityManager.getSlotSnapshots()) {
      if (
        candidate.slotNumber !== slotNumber &&
        candidate.futureItemTypeId === itemTypeId
      ) {
        this.shopShelfEntityManager.setSlotFutureItem(candidate.slotNumber, 0);
      }
    }
    this.shopShelfEntityManager.setSlotFutureItem(slotNumber, itemTypeId, 0);
    return { ok: true, enabled: true, slotNumber, itemTypeId };
  }

  handleProducedItem({ itemTypeId, quantity } = {}) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!Number.isInteger(itemTypeId) || itemTypeId <= 0 || safeQuantity <= 0) return;

    const slot = this.shopShelfEntityManager
      .getSlotSnapshots()
      .find((candidate) => candidate.futureItemTypeId === itemTypeId);
    if (!slot) return;

    this.shopShelfEntityManager.changeSlotFuturePendingQuantity(
      slot.slotNumber,
      safeQuantity,
    );
    this.flushSlot(slot.slotNumber);
  }

  flushPendingItems() {
    for (const slot of this.shopShelfEntityManager.getSlotSnapshots()) {
      if (slot.futureItemTypeId && slot.futurePendingQuantity > 0) {
        this.flushSlot(slot.slotNumber);
      }
    }
  }

  flushSlot(slotNumber) {
    const slot = this.getSlot(slotNumber);
    if (!slot?.futureItemTypeId || slot.futurePendingQuantity <= 0) return null;
    if (slot.sellItemTypeId && slot.sellItemTypeId !== slot.futureItemTypeId) return null;

    const remainingCapacity = MAX_STALL_LOADED_QUANTITY - slot.loadedQuantity;
    const availableQuantity = this.shopSellAvailabilityManager.getAvailableQuantity(
      slot.futureItemTypeId,
    );
    const quantity = Math.min(
      slot.futurePendingQuantity,
      Math.max(0, remainingCapacity),
      Math.max(0, availableQuantity),
    );
    if (quantity <= 0) return null;

    const result = this.shopShelfSlotSelectionManager.loadSlot(
      slotNumber,
      slot.futureItemTypeId,
      quantity,
    );
    if (result?.ok && result.quantity > 0) {
      this.shopShelfEntityManager.changeSlotFuturePendingQuantity(
        slotNumber,
        -result.quantity,
      );
    }
    return result;
  }

  hasFrameTimerWork() {
    return this.shopShelfEntityManager.getSlotSnapshots().some((slot) => {
      if (!slot.futureItemTypeId || slot.futurePendingQuantity <= 0) return false;
      if (slot.sellItemTypeId && slot.sellItemTypeId !== slot.futureItemTypeId) return false;
      if (slot.loadedQuantity >= MAX_STALL_LOADED_QUANTITY) return false;
      return this.shopSellAvailabilityManager.getAvailableQuantity(slot.futureItemTypeId) > 0;
    });
  }

  getSlot(slotNumber) {
    return this.shopShelfEntityManager
      .getSlotSnapshots()
      .find((slot) => slot.slotNumber === slotNumber) ?? null;
  }
}

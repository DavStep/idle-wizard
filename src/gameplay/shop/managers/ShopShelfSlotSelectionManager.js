export const MAX_STALL_LOADED_QUANTITY = 1_000_000;

export class ShopShelfSlotSelectionManager {
  constructor({
    itemsFacade,
    shopSellKindManager,
    shopShelfEntityManager,
    shopSellAvailabilityManager,
    getAccessibleSlotCount,
    getItemAccess,
  }) {
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.getAccessibleSlotCount = getAccessibleSlotCount;
    this.getItemAccess = getItemAccess;
  }

  selectSlot(slotNumber) {
    if (slotNumber > (this.getAccessibleSlotCount?.() ?? Number.POSITIVE_INFINITY)) {
      return { ok: false, reason: 'market_locked', slotNumber };
    }

    if (!this.shopShelfEntityManager.selectSlot(slotNumber)) {
      return { ok: false, reason: 'slot_locked', slotNumber };
    }

    return { ok: true, slotNumber };
  }

  loadSelectedSlot(itemTypeId, quantity = 1) {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();
    if (!selectedSlotNumber) {
      return { ok: false, reason: 'no_selected_slot' };
    }

    return this.loadSlot(selectedSlotNumber, itemTypeId, quantity);
  }

  loadSlot(slotNumber, itemTypeId, quantity = 1) {
    const slot = this.getSlot(slotNumber);
    if (!slot?.unlocked) {
      return { ok: false, reason: 'slot_locked', slotNumber };
    }

    const safeQuantity = this.normalizeQuantity(quantity);
    if (!safeQuantity) {
      return { ok: false, reason: 'invalid_quantity', itemTypeId };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);
    const marketAccess = this.getItemAccess?.(item);
    if (marketAccess && !marketAccess.tradedHere) {
      return {
        ok: false,
        reason: 'market_locked',
        itemTypeId,
        requiredMarket: marketAccess.requiredMarket,
      };
    }

    if (!this.shopSellKindManager.isSellKind(item.kind)) {
      return { ok: false, reason: 'item_not_sellable', itemTypeId };
    }

    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded', itemTypeId };
    }

    const availableQuantity = this.getAvailableQuantity(itemTypeId);
    const remainingCapacity = Math.max(
      0,
      MAX_STALL_LOADED_QUANTITY - slot.loadedQuantity,
    );
    const loadQuantity = Math.min(safeQuantity, availableQuantity, remainingCapacity);
    if (loadQuantity <= 0 || !this.itemsFacade.removeItem(itemTypeId, loadQuantity)) {
      return {
        ok: false,
        reason: remainingCapacity <= 0 ? 'stall_full' : 'not_enough_items',
        itemTypeId,
        availableQuantity,
      };
    }

    if (!slot.sellItemTypeId) {
      this.shopShelfEntityManager.assignSlotSellItem(
        slotNumber,
        itemTypeId,
        loadQuantity,
      );
    } else {
      this.shopShelfEntityManager.changeSlotLoadedQuantity(slotNumber, loadQuantity);
    }

    return {
      ok: true,
      slotNumber,
      quantity: loadQuantity,
      loadedQuantity: slot.loadedQuantity + loadQuantity,
      item: {
        itemTypeId: item.id,
        key: item.key,
        label: item.label,
        kind: item.kind,
      },
    };
  }

  unloadSelectedSlot(quantity = 1) {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();
    if (!selectedSlotNumber) {
      return { ok: false, reason: 'no_selected_slot' };
    }

    const slot = this.getSelectedSlot();
    if (!slot.sellItemTypeId || slot.loadedQuantity <= 0) {
      return { ok: false, reason: 'empty_slot', slotNumber: selectedSlotNumber };
    }

    const safeQuantity = this.normalizeQuantity(quantity);
    if (!safeQuantity) {
      return { ok: false, reason: 'invalid_quantity', slotNumber: selectedSlotNumber };
    }

    const unloadQuantity = Math.min(safeQuantity, slot.loadedQuantity);
    this.itemsFacade.addItem(slot.sellItemTypeId, unloadQuantity);
    const loadedQuantity = this.shopShelfEntityManager.changeSlotLoadedQuantity(
      selectedSlotNumber,
      -unloadQuantity,
    );

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
      quantity: unloadQuantity,
      loadedQuantity,
      itemTypeId: slot.sellItemTypeId,
    };
  }

  setSelectedSlotAllocation(itemTypeId, percentage) {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();
    if (!selectedSlotNumber) {
      return { ok: false, reason: 'no_selected_slot' };
    }

    const safePercentage = Math.max(0, Math.min(100, Math.floor(Number(percentage) || 0)));
    const slot = this.getSlot(selectedSlotNumber);
    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded', itemTypeId };
    }

    const loadedQuantity = slot.sellItemTypeId === itemTypeId ? slot.loadedQuantity : 0;
    const totalQuantity = this.getAvailableQuantity(itemTypeId) + loadedQuantity;
    const targetQuantity = Math.floor((totalQuantity * safePercentage) / 100);
    const delta = targetQuantity - loadedQuantity;
    const result = delta > 0
      ? this.loadSlot(selectedSlotNumber, itemTypeId, delta)
      : delta < 0
        ? this.unloadSelectedSlot(-delta)
        : { ok: true, slotNumber: selectedSlotNumber, quantity: 0, loadedQuantity };

    return {
      ...result,
      percentage: safePercentage,
      targetQuantity,
      totalQuantity,
    };
  }

  unloadSelectedSlotAll() {
    const slot = this.getSelectedSlot();
    return this.unloadSelectedSlot(slot?.loadedQuantity ?? 0);
  }

  getSelectedSlot() {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();
    return (
      this.shopShelfEntityManager
        .getSlotSnapshots()
        .find((slot) => slot.slotNumber === selectedSlotNumber) ?? null
    );
  }

  getSlot(slotNumber) {
    return (
      this.shopShelfEntityManager
        .getSlotSnapshots()
        .find((slot) => slot.slotNumber === slotNumber) ?? null
    );
  }

  normalizeQuantity(quantity) {
    const safeQuantity = Math.floor(Number(quantity));
    return Number.isInteger(safeQuantity) && safeQuantity > 0
      ? Math.min(MAX_STALL_LOADED_QUANTITY, safeQuantity)
      : 0;
  }

  getAvailableQuantity(itemTypeId) {
    const quantity =
      this.shopSellAvailabilityManager?.getAvailableQuantity?.(itemTypeId) ??
      this.itemsFacade?.getItemQuantity?.(itemTypeId) ??
      0;
    return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
  }
}

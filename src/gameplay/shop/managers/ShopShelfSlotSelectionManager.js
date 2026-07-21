const MAX_STALL_LOADED_QUANTITY = 1_000_000;

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

    const slot = this.getSelectedSlot();
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
        selectedSlotNumber,
        itemTypeId,
        loadQuantity,
      );
    } else {
      this.shopShelfEntityManager.changeSlotLoadedQuantity(selectedSlotNumber, loadQuantity);
    }

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
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

  normalizeQuantity(quantity) {
    const safeQuantity = Math.floor(Number(quantity));
    return Number.isInteger(safeQuantity) && safeQuantity > 0
      ? Math.min(10_000, safeQuantity)
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

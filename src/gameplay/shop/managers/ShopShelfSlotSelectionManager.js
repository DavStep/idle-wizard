export class ShopShelfSlotSelectionManager {
  constructor({
    itemsFacade,
    shopSellKindManager,
    shopShelfEntityManager,
    shopSellAvailabilityManager,
  }) {
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
  }

  selectSlot(slotNumber) {
    if (!this.shopShelfEntityManager.selectSlot(slotNumber)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotNumber,
      };
    }

    return {
      ok: true,
      slotNumber,
    };
  }

  setSelectedSlotSellItem(itemTypeId, sellLimit = {}) {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();

    if (!selectedSlotNumber) {
      return {
        ok: false,
        reason: 'no_selected_slot',
      };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);

    if (!this.shopSellKindManager.isSellKind(item.kind)) {
      return {
        ok: false,
        reason: 'item_not_sellable',
        itemTypeId,
      };
    }

    const normalizedSellLimit = this.normalizeSellLimit(itemTypeId, sellLimit);

    if (!normalizedSellLimit.ok) {
      return normalizedSellLimit;
    }

    this.shopShelfEntityManager.assignSlotSellItem(
      selectedSlotNumber,
      itemTypeId,
      normalizedSellLimit,
    );

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
      sellLimitMode: normalizedSellLimit.sellLimitMode,
      sellQuantityLimit: normalizedSellLimit.sellQuantityLimit,
      item: {
        itemTypeId: item.id,
        key: item.key,
        label: item.label,
        kind: item.kind,
      },
    };
  }

  clearSelectedSlotSellItem() {
    const selectedSlotNumber = this.shopShelfEntityManager.getSelectedSlotNumber();

    if (!selectedSlotNumber) {
      return {
        ok: false,
        reason: 'no_selected_slot',
      };
    }

    this.shopShelfEntityManager.clearSlotSellItem(selectedSlotNumber);

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
    };
  }

  normalizeSellLimit(itemTypeId, sellLimit = {}) {
    if (sellLimit.sellLimitMode !== 'amount') {
      return {
        ok: true,
        sellLimitMode: 'all',
        sellQuantityLimit: null,
      };
    }

    const quantity = Math.floor(Number(sellLimit.sellQuantityLimit));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_quantity',
        itemTypeId,
      };
    }

    const availableQuantity = this.getAvailableQuantity(itemTypeId);
    if (quantity > availableQuantity) {
      return {
        ok: false,
        reason: 'not_enough_items',
        itemTypeId,
        availableQuantity,
        quantity,
      };
    }

    return {
      ok: true,
      sellLimitMode: 'amount',
      sellQuantityLimit: quantity,
    };
  }

  getAvailableQuantity(itemTypeId) {
    const quantity =
      this.shopSellAvailabilityManager?.getAvailableQuantity?.(itemTypeId) ??
      this.itemsFacade?.getItemQuantity?.(itemTypeId) ??
      0;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 0;
    }

    return Math.floor(quantity);
  }
}

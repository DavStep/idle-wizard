export class ShopShelfSlotSelectionManager {
  constructor({ itemsFacade, shopSellKindManager, shopShelfEntityManager }) {
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopShelfEntityManager = shopShelfEntityManager;
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

  setSelectedSlotSellItem(itemTypeId) {
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

    this.shopShelfEntityManager.assignSlotSellItem(selectedSlotNumber, itemTypeId);

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
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
}

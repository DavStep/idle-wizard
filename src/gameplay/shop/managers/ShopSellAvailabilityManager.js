export class ShopSellAvailabilityManager {
  constructor({ itemsFacade, getReservedItemQuantity } = {}) {
    this.itemsFacade = itemsFacade;
    this.getReservedItemQuantity = getReservedItemQuantity;
  }

  getAvailableSellableItems(items) {
    return items.map((item) => ({
      ...item,
      quantity: this.getAvailableQuantity(item.itemTypeId),
    }));
  }

  getAvailableQuantity(itemTypeId, extraQuantity = 0) {
    const ownedQuantity = this.itemsFacade?.getItemQuantity(itemTypeId) ?? 0;
    const reservedQuantity = this.getReservedQuantity(itemTypeId);
    return Math.max(0, ownedQuantity + extraQuantity - reservedQuantity);
  }

  canRemoveItem(itemTypeId, quantity = 1, extraQuantity = 0) {
    return this.getAvailableQuantity(itemTypeId, extraQuantity) >= quantity;
  }

  getReservedQuantity(itemTypeId) {
    const reservedQuantity = this.getReservedItemQuantity?.(itemTypeId) ?? 0;

    if (!Number.isFinite(reservedQuantity) || reservedQuantity <= 0) {
      return 0;
    }

    return Math.floor(reservedQuantity);
  }
}

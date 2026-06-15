import { normalizePositiveGoldPrice } from '../../../shared/goldPrice.js';

export class ShopPlayerRequestManager {
  constructor({
    itemsFacade,
    shopSellKindManager,
    shopPlayerRequestEntityManager,
    isRequestSlotUnlocked = () => false,
  } = {}) {
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopPlayerRequestEntityManager = shopPlayerRequestEntityManager;
    this.isRequestSlotUnlocked = isRequestSlotUnlocked;
  }

  setRequest(slotNumber, { itemTypeId, quantity, priceGold }) {
    const safeSlotNumber = Math.floor(Number(slotNumber));

    if (!Number.isInteger(safeSlotNumber) || !this.isRequestSlotUnlocked(safeSlotNumber)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotNumber,
      };
    }

    const safeQuantity = Math.floor(Number(quantity));
    const safePriceGold = normalizePositiveGoldPrice(priceGold);

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    if (safePriceGold === null) {
      return {
        ok: false,
        reason: 'invalid_price',
      };
    }

    const item = this.itemsFacade.getItemDefinition(itemTypeId);

    if (!this.shopSellKindManager.isSellKind(item.kind)) {
      return {
        ok: false,
        reason: 'item_not_requestable',
        itemTypeId,
      };
    }

    this.shopPlayerRequestEntityManager.setRequest(safeSlotNumber, {
      itemTypeId,
      quantity: safeQuantity,
      priceGold: safePriceGold,
    });

    return {
      ok: true,
      slotNumber: safeSlotNumber,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceGold: safePriceGold,
    };
  }

  clearRequest(slotNumber) {
    const safeSlotNumber = Math.floor(Number(slotNumber));

    if (!Number.isInteger(safeSlotNumber) || !this.isRequestSlotUnlocked(safeSlotNumber)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotNumber,
      };
    }

    this.shopPlayerRequestEntityManager.clearRequest(safeSlotNumber);

    return {
      ok: true,
      slotNumber: safeSlotNumber,
    };
  }

  mapItem(item) {
    return {
      itemTypeId: item.id,
      key: item.key,
      label: item.label,
      kind: item.kind,
    };
  }
}

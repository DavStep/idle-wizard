import {
  multiplyGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';
import {
  PLAYER_MARKET_MAX_PRICE_GOLD,
  PLAYER_MARKET_MAX_QUANTITY,
} from '../../../shared/playerMarketLimits.js';

export class ShopPlayerShelfListingManager {
  constructor({
    goldFacade,
    itemsFacade,
    shopSellKindManager,
    shopSellAvailabilityManager,
    shopPlayerShelfEntityManager,
  }) {
    this.goldFacade = goldFacade;
    this.itemsFacade = itemsFacade;
    this.shopSellKindManager = shopSellKindManager;
    this.shopSellAvailabilityManager = shopSellAvailabilityManager;
    this.shopPlayerShelfEntityManager = shopPlayerShelfEntityManager;
  }

  selectSlot(slotNumber) {
    if (!this.shopPlayerShelfEntityManager.selectSlot(slotNumber)) {
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

  setSelectedSlotListing({ itemTypeId, quantity, priceGold }) {
    const selectedSlotNumber = this.shopPlayerShelfEntityManager.getSelectedSlotNumber();

    if (!selectedSlotNumber) {
      return {
        ok: false,
        reason: 'no_selected_slot',
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

    if (safeQuantity > PLAYER_MARKET_MAX_QUANTITY) {
      return {
        ok: false,
        reason: 'quantity_too_high',
        maxQuantity: PLAYER_MARKET_MAX_QUANTITY,
      };
    }

    if (safePriceGold === null) {
      return {
        ok: false,
        reason: 'invalid_price',
      };
    }

    if (safePriceGold > PLAYER_MARKET_MAX_PRICE_GOLD) {
      return {
        ok: false,
        reason: 'price_too_high',
        maxPriceGold: PLAYER_MARKET_MAX_PRICE_GOLD,
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

    const existingSlot = this.shopPlayerShelfEntityManager
      .getSlotSnapshots()
      .find((slot) => slot.slotNumber === selectedSlotNumber);
    const existingSameItemQuantity = existingSlot?.itemTypeId === itemTypeId ? existingSlot.quantity : 0;
    const availableQuantity = this.getAvailableQuantity(itemTypeId, existingSameItemQuantity);

    if (safeQuantity > availableQuantity) {
      return {
        ok: false,
        reason: 'not_enough_item',
        itemTypeId,
        availableQuantity,
        quantity: safeQuantity,
      };
    }

    this.returnReservedSlotItems(existingSlot);

    if (!this.itemsFacade.removeItem(itemTypeId, safeQuantity)) {
      this.reserveExistingSlotAgain(existingSlot);
      return {
        ok: false,
        reason: 'not_enough_item',
        itemTypeId,
        availableQuantity,
        quantity: safeQuantity,
      };
    }

    this.shopPlayerShelfEntityManager.assignSlotListing(selectedSlotNumber, {
      itemTypeId,
      quantity: safeQuantity,
      priceGold: safePriceGold,
    });

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceGold: safePriceGold,
    };
  }

  clearSelectedSlotListing() {
    const selectedSlotNumber = this.shopPlayerShelfEntityManager.getSelectedSlotNumber();

    if (!selectedSlotNumber) {
      return {
        ok: false,
        reason: 'no_selected_slot',
      };
    }

    const existingSlot = this.shopPlayerShelfEntityManager
      .getSlotSnapshots()
      .find((slot) => slot.slotNumber === selectedSlotNumber);

    this.returnReservedSlotItems(existingSlot);
    this.shopPlayerShelfEntityManager.clearSlotListing(selectedSlotNumber);

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
    };
  }

  applyMarketSlotQuantity(slotNumber, quantity) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity)));
    const existingSlot = this.shopPlayerShelfEntityManager
      .getSlotSnapshots()
      .find((slot) => slot.slotNumber === slotNumber);

    if (!existingSlot?.itemTypeId) {
      return {
        ok: false,
        reason: 'empty_slot',
        slotNumber,
      };
    }

    if (safeQuantity >= existingSlot.quantity) {
      return {
        ok: true,
        slotNumber,
        quantity: existingSlot.quantity,
      };
    }

    this.shopPlayerShelfEntityManager.setSlotQuantityFromMarket(slotNumber, safeQuantity);

    return {
      ok: true,
      slotNumber,
      quantity: safeQuantity,
    };
  }

  buyListingItem({ itemKey, quantity = 1, priceGold }) {
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

    const item = this.itemsFacade.safeGetDefinitionByKey(itemKey);

    if (!item) {
      return {
        ok: false,
        reason: 'unknown_item',
        itemKey,
      };
    }

    const totalPriceGold = multiplyGoldPrice(safePriceGold, safeQuantity);

    if (totalPriceGold === null || !this.goldFacade.spend(totalPriceGold)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost: totalPriceGold ?? 0,
      };
    }

    this.itemsFacade.addItem(item.id, safeQuantity);

    return {
      ok: true,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceGold: safePriceGold,
      totalPriceGold,
    };
  }

  claimSaleProceeds(gold) {
    const safeGold = normalizePositiveGoldPrice(gold);

    if (safeGold === null) {
      return {
        ok: false,
        reason: 'invalid_gold',
      };
    }

    this.goldFacade.add(safeGold, { trackGenerated: false });

    return {
      ok: true,
      gold: safeGold,
    };
  }

  returnReservedSlotItems(slot) {
    if (slot?.itemTypeId && slot.quantity > 0) {
      this.itemsFacade.addItem(slot.itemTypeId, slot.quantity);
    }
  }

  reserveExistingSlotAgain(slot) {
    if (!slot?.itemTypeId || slot.quantity <= 0 || slot.priceGold <= 0) {
      return;
    }

    this.itemsFacade.removeItem(slot.itemTypeId, slot.quantity);
  }

  mapItem(item) {
    return {
      itemTypeId: item.id,
      key: item.key,
      label: item.label,
      kind: item.kind,
    };
  }

  getAvailableQuantity(itemTypeId, extraQuantity = 0) {
    return (
      this.shopSellAvailabilityManager?.getAvailableQuantity(itemTypeId, extraQuantity) ??
      this.itemsFacade.getItemQuantity(itemTypeId) + extraQuantity
    );
  }
}

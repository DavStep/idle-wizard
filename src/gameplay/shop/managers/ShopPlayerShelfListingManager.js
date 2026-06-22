import {
  multiplyCoinPrice,
  normalizePositiveCoinPrice,
} from '../../../shared/coinPrice.js';
import {
  PLAYER_MARKET_MAX_PRICE_COIN,
  PLAYER_MARKET_MAX_QUANTITY,
} from '../../../shared/playerMarketLimits.js';

export class ShopPlayerShelfListingManager {
  constructor({
    coinFacade,
    itemsFacade,
    shopSellKindManager,
    shopSellAvailabilityManager,
    shopPlayerShelfEntityManager,
  }) {
    this.coinFacade = coinFacade;
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

  setSelectedSlotListing({ itemTypeId, quantity, priceCoin }) {
    const selectedSlotNumber = this.shopPlayerShelfEntityManager.getSelectedSlotNumber();

    if (!selectedSlotNumber) {
      return {
        ok: false,
        reason: 'no_selected_slot',
      };
    }

    const safeQuantity = Math.floor(Number(quantity));
    const safePriceCoin = normalizePositiveCoinPrice(priceCoin);

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

    if (safePriceCoin === null) {
      return {
        ok: false,
        reason: 'invalid_price',
      };
    }

    if (safePriceCoin > PLAYER_MARKET_MAX_PRICE_COIN) {
      return {
        ok: false,
        reason: 'price_too_high',
        maxPriceCoin: PLAYER_MARKET_MAX_PRICE_COIN,
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
      priceCoin: safePriceCoin,
    });

    return {
      ok: true,
      slotNumber: selectedSlotNumber,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceCoin: safePriceCoin,
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

  buyListingItem({ itemKey, quantity = 1, priceCoin }) {
    const safeQuantity = Math.floor(Number(quantity));
    const safePriceCoin = normalizePositiveCoinPrice(priceCoin);

    if (!Number.isInteger(safeQuantity) || safeQuantity <= 0) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    if (safePriceCoin === null) {
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

    const totalPriceCoin = multiplyCoinPrice(safePriceCoin, safeQuantity);

    if (totalPriceCoin === null || !this.coinFacade.spend(totalPriceCoin)) {
      return {
        ok: false,
        reason: 'not_enough_coin',
        cost: totalPriceCoin ?? 0,
      };
    }

    this.itemsFacade.addItem(item.id, safeQuantity);

    return {
      ok: true,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceCoin: safePriceCoin,
      totalPriceCoin,
    };
  }

  claimSaleProceeds(coin) {
    const safeCoin = normalizePositiveCoinPrice(coin);

    if (safeCoin === null) {
      return {
        ok: false,
        reason: 'invalid_coin',
      };
    }

    this.coinFacade.add(safeCoin, { trackGenerated: false });

    return {
      ok: true,
      coin: safeCoin,
    };
  }

  returnReservedSlotItems(slot) {
    if (slot?.itemTypeId && slot.quantity > 0) {
      this.itemsFacade.addItem(slot.itemTypeId, slot.quantity);
    }
  }

  reserveExistingSlotAgain(slot) {
    if (!slot?.itemTypeId || slot.quantity <= 0 || slot.priceCoin <= 0) {
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

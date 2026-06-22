import { normalizePositiveCoinPrice } from '../../../shared/coinPrice.js';
import {
  PLAYER_MARKET_MAX_PRICE_COIN,
  PLAYER_MARKET_MAX_QUANTITY,
} from '../../../shared/playerMarketLimits.js';

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

  setRequest(slotNumber, { itemTypeId, quantity, priceCoin }) {
    const safeSlotNumber = Math.floor(Number(slotNumber));

    if (!Number.isInteger(safeSlotNumber) || !this.isRequestSlotUnlocked(safeSlotNumber)) {
      return {
        ok: false,
        reason: 'slot_locked',
        slotNumber,
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
        reason: 'item_not_requestable',
        itemTypeId,
      };
    }

    this.shopPlayerRequestEntityManager.setRequest(safeSlotNumber, {
      itemTypeId,
      quantity: safeQuantity,
      priceCoin: safePriceCoin,
    });

    return {
      ok: true,
      slotNumber: safeSlotNumber,
      item: this.mapItem(item),
      quantity: safeQuantity,
      priceCoin: safePriceCoin,
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

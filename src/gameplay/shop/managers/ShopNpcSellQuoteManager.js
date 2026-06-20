import {
  multiplyGoldPrice,
  normalizeGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';
import {
  getNpcBuyPriceGold as getNpcBuyMarketPriceGold,
  getNpcMarketPriceFromNeed,
  normalizeCount,
  NPC_MARKET_MAX_TRADE_QUANTITY,
} from './npcMarketPricing.js';

export class ShopNpcSellQuoteManager {
  constructor({ shopNpcPriceManager } = {}) {
    this.shopNpcPriceManager = shopNpcPriceManager;
  }

  quoteItem({ item, quantity = 1, npcNeed = null } = {}) {
    const safeQuantity = this.normalizeQuantity(quantity);

    if (safeQuantity === null) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    const priceGold = normalizePositiveGoldPrice(
      this.shopNpcPriceManager.getNpcBuyPriceGold(item),
    );
    const npcNeedOverride = npcNeed === null || npcNeed === undefined
      ? null
      : normalizeCount(npcNeed);
    const need = npcNeedOverride ?? this.shopNpcPriceManager.getNpcNeed(item);

    if (priceGold === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    if (!Number.isFinite(need)) {
      return {
        ok: false,
        reason: 'missing_need',
      };
    }

    if (need < safeQuantity) {
      return {
        ok: false,
        reason: 'demand_too_low',
        need,
      };
    }

    const totalPriceGold = this.getMarginalTotalPriceGold({
      item,
      quantity: safeQuantity,
      fallbackPriceGold: priceGold,
      npcNeed,
    });

    if (totalPriceGold === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    return {
      ok: true,
      quantity: safeQuantity,
      priceGold,
      totalPriceGold,
      need,
    };
  }

  normalizeQuantity(quantity) {
    const safeQuantity = Math.floor(Number(quantity));

    if (
      !Number.isInteger(safeQuantity) ||
      safeQuantity <= 0 ||
      safeQuantity > NPC_MARKET_MAX_TRADE_QUANTITY
    ) {
      return null;
    }

    return safeQuantity;
  }

  getMarginalTotalPriceGold({ item, quantity, fallbackPriceGold, npcNeed: npcNeedOverride = null }) {
    const priceState = this.shopNpcPriceManager.getNpcPrice?.(item) ?? item;
    const basePriceGold = normalizePositiveGoldPrice(priceState?.basePriceGold);
    const safeNpcNeedOverride = npcNeedOverride === null || npcNeedOverride === undefined
      ? null
      : normalizeCount(npcNeedOverride);
    const npcNeed = safeNpcNeedOverride ?? normalizeCount(priceState?.npcNeed);
    const targetNeed =
      normalizeCount(priceState?.targetNeed) ??
      normalizeCount(priceState?.targetStock);

    if (
      basePriceGold === null ||
      npcNeed === null ||
      targetNeed === null ||
      targetNeed <= 0
    ) {
      return multiplyGoldPrice(fallbackPriceGold, quantity);
    }

    let totalCents = 0;

    for (let offset = 0; offset < quantity; offset += 1) {
      const marketPriceGold = getNpcMarketPriceFromNeed({
        basePriceGold,
        itemKind: priceState?.itemKind ?? item?.kind,
        npcNeed: npcNeed - offset,
        targetNeed,
        volatilityBps: priceState?.volatilityBps,
      });
      const unitPriceGold = getNpcBuyMarketPriceGold(marketPriceGold);

      if (unitPriceGold === null) {
        return multiplyGoldPrice(fallbackPriceGold, quantity);
      }

      totalCents += Math.round(unitPriceGold * 100);
    }

    return normalizeGoldPrice(totalCents / 100);
  }
}

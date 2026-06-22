import {
  multiplyCoinPrice,
  normalizeCoinPrice,
  normalizePositiveCoinPrice,
} from '../../../shared/coinPrice.js';
import {
  getNpcBuyPriceCoin as getNpcBuyMarketPriceCoin,
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

    const priceCoin = normalizePositiveCoinPrice(
      this.shopNpcPriceManager.getNpcBuyPriceCoin(item),
    );
    const npcNeedOverride = npcNeed === null || npcNeed === undefined
      ? null
      : normalizeCount(npcNeed);
    const need = npcNeedOverride ?? this.shopNpcPriceManager.getNpcNeed(item);

    if (priceCoin === null) {
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

    const totalPriceCoin = this.getMarginalTotalPriceCoin({
      item,
      quantity: safeQuantity,
      fallbackPriceCoin: priceCoin,
      npcNeed,
    });

    if (totalPriceCoin === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    return {
      ok: true,
      quantity: safeQuantity,
      priceCoin,
      totalPriceCoin,
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

  getMarginalTotalPriceCoin({ item, quantity, fallbackPriceCoin, npcNeed: npcNeedOverride = null }) {
    const priceState = this.shopNpcPriceManager.getNpcPrice?.(item) ?? item;
    const basePriceCoin = normalizePositiveCoinPrice(priceState?.basePriceCoin);
    const safeNpcNeedOverride = npcNeedOverride === null || npcNeedOverride === undefined
      ? null
      : normalizeCount(npcNeedOverride);
    const npcNeed = safeNpcNeedOverride ?? normalizeCount(priceState?.npcNeed);
    const targetNeed =
      normalizeCount(priceState?.targetNeed) ??
      normalizeCount(priceState?.targetStock);

    if (
      basePriceCoin === null ||
      npcNeed === null ||
      targetNeed === null ||
      targetNeed <= 0
    ) {
      return multiplyCoinPrice(fallbackPriceCoin, quantity);
    }

    let totalCents = 0;

    for (let offset = 0; offset < quantity; offset += 1) {
      const marketPriceCoin = getNpcMarketPriceFromNeed({
        basePriceCoin,
        itemKind: priceState?.itemKind ?? item?.kind,
        npcNeed: npcNeed - offset,
        targetNeed,
        volatilityBps: priceState?.volatilityBps,
      });
      const unitPriceCoin = getNpcBuyMarketPriceCoin(marketPriceCoin);

      if (unitPriceCoin === null) {
        return multiplyCoinPrice(fallbackPriceCoin, quantity);
      }

      totalCents += Math.round(unitPriceCoin * 100);
    }

    return normalizeCoinPrice(totalCents / 100);
  }
}

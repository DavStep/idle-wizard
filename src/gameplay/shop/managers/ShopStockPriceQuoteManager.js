import {
  multiplyGoldPrice,
  normalizeGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';
import {
  getNpcMarketPriceFromNeed,
  getNpcSellPriceGold as getNpcSellMarketPriceGold,
  normalizeCount,
  NPC_MARKET_MAX_TRADE_QUANTITY,
} from './npcMarketPricing.js';

export class ShopStockPriceQuoteManager {
  constructor({ shopNpcPriceManager } = {}) {
    this.shopNpcPriceManager = shopNpcPriceManager;
  }

  quoteItem({ item, quantity = 1 } = {}) {
    const safeQuantity = this.normalizeQuantity(quantity);

    if (safeQuantity === null) {
      return {
        ok: false,
        reason: 'invalid_quantity',
      };
    }

    const priceGold = normalizePositiveGoldPrice(
      this.shopNpcPriceManager.getNpcSellPriceGold(item),
    );
    const stock = this.shopNpcPriceManager.getNpcStock(item);

    if (priceGold === null) {
      return {
        ok: false,
        reason: 'missing_price',
      };
    }

    if (!Number.isFinite(stock) || stock < safeQuantity) {
      return {
        ok: false,
        reason: 'empty_stock',
      };
    }

    const totalPriceGold = this.getMarginalTotalPriceGold({
      item,
      quantity: safeQuantity,
      fallbackPriceGold: priceGold,
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

  getMarginalTotalPriceGold({ item, quantity, fallbackPriceGold }) {
    const priceState = this.shopNpcPriceManager.getNpcPrice?.(item) ?? item;
    const basePriceGold = normalizePositiveGoldPrice(priceState?.basePriceGold);
    const npcNeed = normalizeCount(priceState?.npcNeed);
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
        npcNeed: npcNeed + offset,
        targetNeed,
        volatilityBps: priceState?.volatilityBps,
      });
      const unitPriceGold = getNpcSellMarketPriceGold(marketPriceGold);

      if (unitPriceGold === null) {
        return multiplyGoldPrice(fallbackPriceGold, quantity);
      }

      totalCents += Math.round(unitPriceGold * 100);
    }

    return normalizeGoldPrice(totalCents / 100);
  }
}

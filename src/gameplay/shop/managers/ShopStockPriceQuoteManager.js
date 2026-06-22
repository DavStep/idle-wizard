import {
  multiplyCoinPrice,
  normalizeCoinPrice,
  normalizePositiveCoinPrice,
} from '../../../shared/coinPrice.js';
import {
  getNpcMarketPriceFromNeed,
  getNpcSellPriceCoin as getNpcSellMarketPriceCoin,
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

    const priceCoin = normalizePositiveCoinPrice(
      this.shopNpcPriceManager.getNpcSellPriceCoin(item),
    );
    const stock = this.shopNpcPriceManager.getNpcStock(item);

    if (priceCoin === null) {
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

    const totalPriceCoin = this.getMarginalTotalPriceCoin({
      item,
      quantity: safeQuantity,
      fallbackPriceCoin: priceCoin,
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

  getMarginalTotalPriceCoin({ item, quantity, fallbackPriceCoin }) {
    const priceState = this.shopNpcPriceManager.getNpcPrice?.(item) ?? item;
    const basePriceCoin = normalizePositiveCoinPrice(priceState?.basePriceCoin);
    const npcNeed = normalizeCount(priceState?.npcNeed);
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
        npcNeed: npcNeed + offset,
        targetNeed,
        volatilityBps: priceState?.volatilityBps,
      });
      const unitPriceCoin = getNpcSellMarketPriceCoin(marketPriceCoin);

      if (unitPriceCoin === null) {
        return multiplyCoinPrice(fallbackPriceCoin, quantity);
      }

      totalCents += Math.round(unitPriceCoin * 100);
    }

    return normalizeCoinPrice(totalCents / 100);
  }
}

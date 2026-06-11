import {
  multiplyGoldPrice,
  normalizeGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';

const NPC_MARKET_BUY_BPS = 8_000;
const NPC_MARKET_SELL_BPS = 12_000;
const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;

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
    const npcNeed = this.normalizeCount(priceState?.npcNeed);
    const targetNeed =
      this.normalizeCount(priceState?.targetNeed) ??
      this.normalizeCount(priceState?.targetStock);
    const maxNeed = this.normalizeCount(priceState?.maxNeed) ?? targetNeed * 2;

    if (
      basePriceGold === null ||
      npcNeed === null ||
      targetNeed === null ||
      maxNeed === null ||
      targetNeed <= 0 ||
      maxNeed <= targetNeed
    ) {
      return multiplyGoldPrice(fallbackPriceGold, quantity);
    }

    let totalCents = 0;

    for (let offset = 0; offset < quantity; offset += 1) {
      const marketPriceGold = this.getNpcMarketPriceFromNeed({
        basePriceGold,
        npcNeed: npcNeed + offset,
        targetNeed,
        maxNeed,
      });
      const unitPriceGold = this.getNpcSellPriceGold(marketPriceGold);
      totalCents += Math.round(unitPriceGold * 100);
    }

    return normalizeGoldPrice(totalCents / 100);
  }

  normalizeCount(value) {
    const count = Math.floor(Number(value));

    if (!Number.isInteger(count) || count < 0) {
      return null;
    }

    return count;
  }

  getNpcMarketPriceFromNeed({ basePriceGold, npcNeed, targetNeed, maxNeed }) {
    const floorGold = this.getNpcMarketFloorGold(basePriceGold);
    const ceilingGold = this.getNpcMarketCeilingGold(basePriceGold);
    const safeNeed = this.clampNumber(npcNeed, 0, maxNeed);

    if (safeNeed <= targetNeed) {
      const lowerRange = basePriceGold - floorGold;
      return this.clampNpcMarketPrice(
        basePriceGold,
        floorGold + lowerRange * (safeNeed / targetNeed),
      );
    }

    const upperRange = ceilingGold - basePriceGold;
    const upperNeed = maxNeed - targetNeed;
    const extraNeed = safeNeed - targetNeed;

    return this.clampNpcMarketPrice(
      basePriceGold,
      basePriceGold + upperRange * (extraNeed / upperNeed),
    );
  }

  getNpcSellPriceGold(marketPriceGold) {
    const buyPriceGold = this.getNpcBuyPriceGold(marketPriceGold);
    const spreadPriceGold = this.roundGoldPrice(
      (marketPriceGold * NPC_MARKET_SELL_BPS) / 10_000,
    );

    return spreadPriceGold > buyPriceGold
      ? spreadPriceGold
      : this.roundGoldPrice(buyPriceGold + 0.01);
  }

  getNpcBuyPriceGold(marketPriceGold) {
    return this.clampNumber(
      this.roundGoldPrice((marketPriceGold * NPC_MARKET_BUY_BPS) / 10_000),
      0.01,
      marketPriceGold,
    );
  }

  getNpcMarketFloorGold(basePriceGold) {
    return Math.max(0.01, this.roundGoldPrice(basePriceGold / 4));
  }

  getNpcMarketCeilingGold(basePriceGold) {
    return this.roundGoldPrice(basePriceGold * 4);
  }

  clampNpcMarketPrice(basePriceGold, priceGold) {
    return this.roundGoldPrice(
      this.clampNumber(
        priceGold,
        this.getNpcMarketFloorGold(basePriceGold),
        this.getNpcMarketCeilingGold(basePriceGold),
      ),
    );
  }

  roundGoldPrice(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  clampNumber(value, min, max) {
    if (value < min) {
      return min;
    }

    if (value > max) {
      return max;
    }

    return value;
  }
}

import {
  multiplyGoldPrice,
  normalizeGoldPrice,
  normalizePositiveGoldPrice,
} from '../../../shared/goldPrice.js';

const NPC_MARKET_BUY_BPS = 8_000;
const NPC_MARKET_MAX_TRADE_QUANTITY = 10_000;

export class ShopNpcSellQuoteManager {
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
      this.shopNpcPriceManager.getNpcBuyPriceGold(item),
    );
    const need = this.shopNpcPriceManager.getNpcNeed(item);

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

  getMarginalTotalPriceGold({ item, quantity, fallbackPriceGold }) {
    const priceState = this.shopNpcPriceManager.getNpcPrice?.(item) ?? item;
    const basePriceGold = normalizePositiveGoldPrice(priceState?.basePriceGold);
    const npcNeed = this.normalizeCount(priceState?.npcNeed);
    const targetNeed =
      this.normalizeCount(priceState?.targetNeed) ??
      this.normalizeCount(priceState?.targetStock);

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
      const marketPriceGold = this.getNpcMarketPriceFromNeed({
        basePriceGold,
        npcNeed: npcNeed - offset,
        targetNeed,
      });
      const unitPriceGold = this.getNpcBuyPriceGold(marketPriceGold);
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

  getNpcMarketPriceFromNeed({ basePriceGold, npcNeed, targetNeed }) {
    const safeNeed = Math.max(0, npcNeed);
    const pressure = safeNeed / targetNeed;
    const marketPriceGold = basePriceGold * pressure;

    return this.roundGoldPrice(Math.max(0.01, marketPriceGold));
  }

  getNpcBuyPriceGold(marketPriceGold) {
    return Math.min(
      Math.max(
        this.roundGoldPrice((marketPriceGold * NPC_MARKET_BUY_BPS) / 10_000),
        0.01,
      ),
      marketPriceGold,
    );
  }

  roundGoldPrice(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

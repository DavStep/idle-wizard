import { describe, expect, it } from 'vitest';

import { ShopStockPriceQuoteManager } from './ShopStockPriceQuoteManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'Sage Seed',
  kind: 'seed',
};

describe('ShopStockPriceQuoteManager', () => {
  it('quotes large NPC stock buys from marginal market prices', () => {
    const manager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: {
        getNpcSellPriceGold: () => 1.2,
        getNpcStock: () => 2000,
        getNpcPrice: () => ({
          basePriceGold: 1,
          npcNeed: 1000,
          targetNeed: 1000,
          maxNeed: 2000,
        }),
      },
    });

    const quote = manager.quoteItem({ item: sageSeed, quantity: 1000 });

    expect(quote).toMatchObject({
      ok: true,
      quantity: 1000,
      priceGold: 1.2,
    });
    expect(quote.totalPriceGold).toBeGreaterThan(1.2 * 1000);
  });

  it('falls back to simple multiplication when the market curve is unavailable', () => {
    const manager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: {
        getNpcSellPriceGold: () => 1.25,
        getNpcStock: () => 10,
        getNpcPrice: () => null,
      },
    });

    expect(manager.quoteItem({ item: sageSeed, quantity: 3 })).toMatchObject({
      ok: true,
      priceGold: 1.25,
      totalPriceGold: 3.75,
    });
  });
});

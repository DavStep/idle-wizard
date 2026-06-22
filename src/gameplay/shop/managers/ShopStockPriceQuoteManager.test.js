import { describe, expect, it } from 'vitest';

import { ShopStockPriceQuoteManager } from './ShopStockPriceQuoteManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'sage seed',
  kind: 'seed',
};

describe('ShopStockPriceQuoteManager', () => {
  it('quotes large NPC stock buys from marginal market prices', () => {
    const manager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: {
        getNpcSellPriceCoin: () => 1.2,
        getNpcStock: () => 2000,
        getNpcPrice: () => ({
          basePriceCoin: 1,
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
      priceCoin: 1.2,
    });
    expect(quote.totalPriceCoin).toBeGreaterThan(1.2 * 1000);
  });

  it('does not cap prices at the old max need boundary', () => {
    const manager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: {
        getNpcSellPriceCoin: () => 6,
        getNpcStock: () => 1,
        getNpcPrice: () => ({
          basePriceCoin: 1,
          npcNeed: 5000,
          targetNeed: 1000,
          maxNeed: 2000,
        }),
      },
    });

    expect(manager.quoteItem({ item: sageSeed, quantity: 1 })).toMatchObject({
      ok: true,
      priceCoin: 6,
    });
    expect(manager.quoteItem({ item: sageSeed, quantity: 1 }).totalPriceCoin).toBeGreaterThan(6);
  });

  it('falls back to simple multiplication when the market curve is unavailable', () => {
    const manager = new ShopStockPriceQuoteManager({
      shopNpcPriceManager: {
        getNpcSellPriceCoin: () => 1.25,
        getNpcStock: () => 10,
        getNpcPrice: () => null,
      },
    });

    expect(manager.quoteItem({ item: sageSeed, quantity: 3 })).toMatchObject({
      ok: true,
      priceCoin: 1.25,
      totalPriceCoin: 3.75,
    });
  });
});

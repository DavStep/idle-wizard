import { describe, expect, it } from 'vitest';

import { ShopNpcSellQuoteManager } from './ShopNpcSellQuoteManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'sage seed',
  kind: 'seed',
};

describe('ShopNpcSellQuoteManager', () => {
  it('quotes direct NPC sells from marginal market prices', () => {
    const manager = new ShopNpcSellQuoteManager({
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 0.8,
        getNpcNeed: () => 1000,
        getNpcPrice: () => ({
          basePriceGold: 1,
          npcNeed: 1000,
          targetNeed: 1000,
        }),
      },
    });

    const quote = manager.quoteItem({ item: sageSeed, quantity: 1000 });

    expect(quote).toMatchObject({
      ok: true,
      quantity: 1000,
      priceGold: 0.8,
    });
    expect(quote.totalPriceGold).toBeLessThan(0.8 * 1000);
    expect(quote.totalPriceGold).toBeGreaterThan(0);
  });

  it('blocks direct NPC sells above current demand', () => {
    const manager = new ShopNpcSellQuoteManager({
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 0.8,
        getNpcNeed: () => 2,
      },
    });

    expect(manager.quoteItem({ item: sageSeed, quantity: 3 })).toMatchObject({
      ok: false,
      reason: 'demand_too_low',
      need: 2,
    });
  });

  it('falls back to simple multiplication when market curve is unavailable', () => {
    const manager = new ShopNpcSellQuoteManager({
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 0.8,
        getNpcNeed: () => 10,
        getNpcPrice: () => null,
      },
    });

    expect(manager.quoteItem({ item: sageSeed, quantity: 3 })).toMatchObject({
      ok: true,
      quantity: 3,
      totalPriceGold: 2.4,
    });
  });
});

import { describe, expect, it } from 'vitest';

import { TutorialSaleManager } from './TutorialSaleManager.js';

describe('TutorialSaleManager', () => {
  it('does not override timed stall prices', () => {
    const manager = new TutorialSaleManager();

    expect(manager.getNpcSellPriceOverride({ itemKey: 'sageSeed' })).toBeNull();
  });

  it('can update and cancel without owning sale state', () => {
    const manager = new TutorialSaleManager();

    expect(() => manager.update()).not.toThrow();
    expect(() => manager.cancel()).not.toThrow();
  });

  it('does not override NPC market prices or stock quotes', () => {
    const manager = new TutorialSaleManager();

    expect(manager.getNpcSellPriceOverride({ itemKey: 'sageSeed' })).toBeNull();
    expect(
      manager.getNpcStockBuyQuoteOverride({
        itemKey: 'sageSeed',
        quantity: 5,
      }),
    ).toBeNull();
  });
});

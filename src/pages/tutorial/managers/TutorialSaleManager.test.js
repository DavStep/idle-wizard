import { describe, expect, it } from 'vitest';

import { TutorialSaleManager } from './TutorialSaleManager.js';

describe('TutorialSaleManager', () => {
  it('does not override direct sell quotes', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.getDirectSellQuoteOverride({
        step: { id: 'earn-tutorial-coin' },
        itemKey: 'sageSeed',
        quantity: 5,
      }),
    ).toBeNull();
  });

  it('lets normal direct sell handle every confirm action', () => {
    const manager = new TutorialSaleManager();

    expect(
      manager.handleDirectSellOverride({
        step: { id: 'earn-tutorial-coin' },
        itemKey: 'sageSeed',
        quantity: 5,
      }),
    ).toEqual({ handled: false });
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

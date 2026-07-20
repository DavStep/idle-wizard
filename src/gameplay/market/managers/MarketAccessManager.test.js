import { describe, expect, it } from 'vitest';

import { MarketAccessManager } from './MarketAccessManager.js';

describe('MarketAccessManager', () => {
  it('uses market rank as the stall count', () => {
    const manager = new MarketAccessManager();

    expect(manager.getStallCount({ rank: 1 })).toBe(1);
    expect(manager.getStallCount({ rank: 5 })).toBe(5);
  });

  it('names the market required for goods above the current rank', () => {
    const manager = new MarketAccessManager();

    expect(manager.getItemAccess(
      { marketGrade: 3 },
      { id: 'smallTown', rank: 1 },
    )).toMatchObject({
      grade: 3,
      tradedHere: false,
      requiredMarket: { id: 'cityBazaar', name: 'City Bazaar' },
    });
  });
});

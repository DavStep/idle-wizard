import { describe, expect, it } from 'vitest';

import {
  getMarketGradeForCatalogIndex,
  getRequiredMarketLicence,
  isItemGradeTradedInMarket,
} from './marketLicence.js';

describe('market licence access', () => {
  it('splits an ordered catalogue into five cumulative grades', () => {
    expect(Array.from({ length: 10 }, (_value, index) =>
      getMarketGradeForCatalogIndex(index, 10)))
      .toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('keeps lower-grade goods available in higher-rank markets', () => {
    expect(isItemGradeTradedInMarket(1, 'smallTown')).toBe(true);
    expect(isItemGradeTradedInMarket(2, 'smallTown')).toBe(false);
    expect(isItemGradeTradedInMarket(1, 'arcaneExchange')).toBe(true);
    expect(isItemGradeTradedInMarket(5, 'arcaneExchange')).toBe(true);
  });

  it('names the first market that trades an item grade', () => {
    expect(getRequiredMarketLicence(3)).toMatchObject({
      id: 'cityBazaar',
      name: 'City Bazaar',
      rank: 3,
    });
  });
});

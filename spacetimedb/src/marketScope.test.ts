import { describe, expect, it } from 'vitest';

import { assertMarketScope, getMarketScopedKey } from './marketScope';

describe('market scope validation', () => {
  it('rejects a forged cross-market reducer market id', () => {
    expect(() => assertMarketScope(0, 'arcaneExchange')).toThrow(
      'Market licence does not match the active market.',
    );
  });

  it('accepts the highest licence unlocked by permanent Prestige stars', () => {
    expect(assertMarketScope(6, 'grandExchange')).toBe('grandExchange');
  });

  it('keeps NPC stock and demand keys independent between markets', () => {
    const stockByKey = new Map([
      [getMarketScopedKey('smallTown', 'sageSeed'), 3],
      [getMarketScopedKey('arcaneExchange', 'sageSeed'), 8],
    ]);

    stockByKey.set(getMarketScopedKey('arcaneExchange', 'sageSeed'), 1);

    expect(stockByKey.get(getMarketScopedKey('smallTown', 'sageSeed'))).toBe(3);
    expect(stockByKey.get(getMarketScopedKey('arcaneExchange', 'sageSeed'))).toBe(1);
  });

  it('keeps player listing and request slots independent between markets', () => {
    const listingKey = 'identity:1';
    const requestKey = 'identity:2';

    expect(getMarketScopedKey('smallTown', listingKey)).toBe(listingKey);
    expect(getMarketScopedKey('cityBazaar', listingKey)).toBe('cityBazaar:identity:1');
    expect(getMarketScopedKey('smallTown', requestKey)).not.toBe(
      getMarketScopedKey('cityBazaar', requestKey),
    );
  });

  it('keeps starter goods available in a high-tier market pool', () => {
    expect(assertMarketScope(10, 'arcaneExchange')).toBe('arcaneExchange');
    expect(getMarketScopedKey('arcaneExchange', 'sageSeed')).toBe('arcaneExchange:sageSeed');
  });
});

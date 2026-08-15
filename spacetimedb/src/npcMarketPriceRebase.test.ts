import { describe, expect, it } from 'vitest';

import {
  rebaseNpcMarketCatalogConfig,
  resetNpcMarketTuningScores,
} from './npcMarketPriceRebase';

describe('NPC market price rebase', () => {
  it('overwrites an old auto-tuned base with the current catalog base', () => {
    expect(
      rebaseNpcMarketCatalogConfig(
        {
          itemKey: 'cityBazaar:dragonCourage',
          defaultBasePriceGold: 21_140_000n,
          basePriceGold: 30_000n,
          targetStock: 300n,
          enabled: true,
        },
        {
          storedCatalogBasePriceGold: 13_212_500n,
          priceScale: 100,
          updatedAt: 'now',
        },
      ),
    ).toEqual({
      itemKey: 'cityBazaar:dragonCourage',
      defaultBasePriceGold: 13_212_500n,
      basePriceGold: 13_212_500n,
      targetStock: 300n,
      enabled: true,
      priceScale: 100,
      updatedAt: 'now',
    });
  });

  it('clears tuning scores without changing stock or buyer demand', () => {
    expect(
      resetNpcMarketTuningScores(
        {
          itemKey: 'cityBazaar:dragonCourage',
          npcStock: 17n,
          npcNeed: 421n,
          targetNeed: 300n,
          demandScore: 40n,
          supplyScore: 65n,
        },
        'now',
      ),
    ).toEqual({
      itemKey: 'cityBazaar:dragonCourage',
      npcStock: 17n,
      npcNeed: 421n,
      targetNeed: 300n,
      demandScore: 0n,
      supplyScore: 0n,
      updatedAt: 'now',
    });
  });
});

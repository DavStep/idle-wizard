import { describe, expect, it } from 'vitest';

import {
  appendMissingItemConfigRows,
  normalizeLegacySeedSummonCosts,
  rebaseItemConfigSellPrices,
  rebaseVersionedHerbGrowthDurations,
  rebaseVersionedItemConfigSellPrices,
} from './itemConfigRows';

describe('appendMissingItemConfigRows', () => {
  it('backfills a newly introduced catalog list when the stored config predates it', () => {
    const defaultIngredients = [
      { id: 3001, key: 'ratTail', label: 'rat tail', rarity: 'common' },
      {
        id: 3060,
        key: 'featherOfEternity',
        label: 'feather of eternity',
        rarity: 'mythical',
      },
    ];

    expect(
      appendMissingItemConfigRows(
        undefined,
        defaultIngredients,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual(defaultIngredients);
  });

  it('preserves stored rows and appends only new catalog entries', () => {
    const storedRows = [{ id: 3001, key: 'ratTail', label: 'custom rat tail' }];
    const defaultRows = [
      { id: 3001, key: 'ratTail', label: 'rat tail' },
      { id: 3002, key: 'crowFeather', label: 'crow feather' },
    ];

    expect(
      appendMissingItemConfigRows(
        storedRows,
        defaultRows,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual([
      { id: 3001, key: 'ratTail', label: 'custom rat tail' },
      { id: 3002, key: 'crowFeather', label: 'crow feather' },
    ]);
  });
});

describe('normalizeLegacySeedSummonCosts', () => {
  it.each([15, 50])('migrates the legacy %i-mana cost to 10', (legacyCost) => {
    const storedRows = [
      { id: 1, key: 'sageSeed', summonManaCost: legacyCost },
      { id: 2, key: 'mintSeed', summonManaCost: legacyCost },
    ];
    const defaultRows = [
      { id: 1, key: 'sageSeed', summonManaCost: 10 },
      { id: 2, key: 'mintSeed', summonManaCost: 10 },
    ];

    expect(
      normalizeLegacySeedSummonCosts(
        storedRows,
        defaultRows,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual([
      { id: 1, key: 'sageSeed', summonManaCost: 10 },
      { id: 2, key: 'mintSeed', summonManaCost: 10 },
    ]);
  });

  it('preserves an intentional non-legacy runtime override', () => {
    const storedRows = [{ id: 1, key: 'sageSeed', summonManaCost: 75 }];
    const defaultRows = [{ id: 1, key: 'sageSeed', summonManaCost: 10 }];

    expect(
      normalizeLegacySeedSummonCosts(
        storedRows,
        defaultRows,
        (row) => String(row.key ?? ''),
      ),
    ).toBe(storedRows);
  });
});

describe('rebaseItemConfigSellPrices', () => {
  it('replaces every old price while preserving catalog row identity and metadata', () => {
    expect(
      rebaseItemConfigSellPrices(
        [
          { id: 2015, key: 'starLuckPhiltre', label: 'star-luck', baseSellPrice: 393.6 },
          { id: 2016, key: 'dragonCourage', label: 'dragon', baseSellPrice: 300 },
        ],
        [
          { key: 'starLuckPhiltre', baseSellPrice: 32_050 },
          { key: 'dragonCourage', baseSellPrice: 105_700 },
        ],
        (row) => String(row.key ?? ''),
      ),
    ).toEqual([
      { id: 2015, key: 'starLuckPhiltre', label: 'star-luck', baseSellPrice: 32_050 },
      { id: 2016, key: 'dragonCourage', label: 'dragon', baseSellPrice: 105_700 },
    ]);
  });

  it('returns the original rows when every price already matches', () => {
    const storedRows = [{ key: 'starLuckPhiltre', baseSellPrice: 32_050 }];

    expect(
      rebaseItemConfigSellPrices(
        storedRows,
        [{ key: 'starLuckPhiltre', baseSellPrice: 32_050 }],
        (row) => String(row.key ?? ''),
      ),
    ).toBe(storedRows);
  });
});

describe('rebaseVersionedItemConfigSellPrices', () => {
  const defaults = {
    seeds: [{ key: 'starAniseSeed', baseSellPrice: 2_048 }],
    herbs: [{ key: 'starAniseHerb', baseSellPrice: 10_240 }],
    potions: [{ key: 'starLuckPhiltre', baseSellPrice: 32_050 }],
  };

  it('upgrades every hosted item price list together and records the version', () => {
    expect(
      rebaseVersionedItemConfigSellPrices(
        {
          seeds: [{ key: 'starAniseSeed', baseSellPrice: 1 }],
          herbs: [{ key: 'starAniseHerb', baseSellPrice: 36 }],
          potions: [{ key: 'starLuckPhiltre', baseSellPrice: 393.6 }],
          ingredients: [{ key: 'ratTail', rarity: 'common' }],
        },
        defaults,
        2,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual({
      sellPriceVersion: 2,
      seeds: [{ key: 'starAniseSeed', baseSellPrice: 2_048 }],
      herbs: [{ key: 'starAniseHerb', baseSellPrice: 10_240 }],
      potions: [{ key: 'starLuckPhiltre', baseSellPrice: 32_050 }],
      ingredients: [{ key: 'ratTail', rarity: 'common' }],
    });
  });

  it('preserves intentional overrides after the current price version is installed', () => {
    const currentConfig = {
      sellPriceVersion: 2,
      seeds: [{ key: 'starAniseSeed', baseSellPrice: 3_000 }],
      herbs: [{ key: 'starAniseHerb', baseSellPrice: 12_000 }],
      potions: [{ key: 'starLuckPhiltre', baseSellPrice: 40_000 }],
    };

    expect(
      rebaseVersionedItemConfigSellPrices(
        currentConfig,
        defaults,
        2,
        (row) => String(row.key ?? ''),
      ),
    ).toBe(currentConfig);
  });
});

describe('rebaseVersionedHerbGrowthDurations', () => {
  it('installs the balanced timer catalog once without keeping old durations', () => {
    expect(
      rebaseVersionedHerbGrowthDurations(
        {
          herbs: [
            { key: 'sageHerb', growthDurationMs: 12_000 },
            { key: 'glowcapHerb', growthDurationMs: 60_000 },
          ],
        },
        {
          herbs: [
            { key: 'sageHerb', growthDurationMs: 12_000 },
            { key: 'glowcapHerb', growthDurationMs: 111_000 },
          ],
        },
        1,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual({
      growthTimerVersion: 1,
      herbs: [
        { key: 'sageHerb', growthDurationMs: 12_000 },
        { key: 'glowcapHerb', growthDurationMs: 111_000 },
      ],
    });
  });

  it('preserves live tuning once the timer version is current', () => {
    const currentConfig = {
      growthTimerVersion: 1,
      herbs: [{ key: 'glowcapHerb', growthDurationMs: 120_000 }],
    };

    expect(
      rebaseVersionedHerbGrowthDurations(
        currentConfig,
        { herbs: [{ key: 'glowcapHerb', growthDurationMs: 111_000 }] },
        1,
        (row) => String(row.key ?? ''),
      ),
    ).toBe(currentConfig);
  });
});

import { describe, expect, it } from 'vitest';

import {
  appendMissingItemConfigRows,
  normalizeLegacySeedSummonCosts,
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
  it.each([10, 15])('migrates the legacy %i-mana cost to 50', (legacyCost) => {
    const storedRows = [
      { id: 1, key: 'sageSeed', summonManaCost: legacyCost },
      { id: 2, key: 'mintSeed', summonManaCost: legacyCost },
    ];
    const defaultRows = [
      { id: 1, key: 'sageSeed', summonManaCost: 50 },
      { id: 2, key: 'mintSeed', summonManaCost: 50 },
    ];

    expect(
      normalizeLegacySeedSummonCosts(
        storedRows,
        defaultRows,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual([
      { id: 1, key: 'sageSeed', summonManaCost: 50 },
      { id: 2, key: 'mintSeed', summonManaCost: 50 },
    ]);
  });

  it('preserves an intentional non-legacy runtime override', () => {
    const storedRows = [{ id: 1, key: 'sageSeed', summonManaCost: 75 }];
    const defaultRows = [{ id: 1, key: 'sageSeed', summonManaCost: 50 }];

    expect(
      normalizeLegacySeedSummonCosts(
        storedRows,
        defaultRows,
        (row) => String(row.key ?? ''),
      ),
    ).toBe(storedRows);
  });
});

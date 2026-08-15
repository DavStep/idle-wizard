import { describe, expect, it } from 'vitest';

import {
  appendMissingItemConfigRows,
  normalizeLegacyPotionSellPrices,
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

describe('normalizeLegacyPotionSellPrices', () => {
  const herbRows = [
    { key: 'sageHerb', baseSellPrice: 6.4 },
    { key: 'mintHerb', baseSellPrice: 7.2 },
    { key: 'sunrootHerb', baseSellPrice: 20 },
    { key: 'dragonpepperHerb', baseSellPrice: 52 },
    { key: 'belladonnaHerb', baseSellPrice: 192 },
    { key: 'pearlrootHerb', baseSellPrice: 328 },
  ];
  const recipes = [
    {
      potionKey: 'manaTonic',
      ingredients: [{ itemKey: 'sageHerb', quantity: 3 }],
    },
    {
      potionKey: 'minorHealingPotion',
      ingredients: [
        { itemKey: 'sageHerb', quantity: 2 },
        { itemKey: 'mintHerb', quantity: 1 },
      ],
    },
    {
      potionKey: 'pearlrootDraught',
      ingredients: [
        { itemKey: 'pearlrootHerb', quantity: 1 },
        { itemKey: 'dragonpepperHerb', quantity: 1 },
        { itemKey: 'belladonnaHerb', quantity: 1 },
        { itemKey: 'sunrootHerb', quantity: 1 },
      ],
    },
  ];

  it('reprices legacy potions to four times their current herb inputs', () => {
    expect(
      normalizeLegacyPotionSellPrices(
        [
          { key: 'manaTonic', baseSellPrice: 55.2 },
          { key: 'minorHealingPotion', baseSellPrice: 60 },
          { key: 'pearlrootDraught', baseSellPrice: 740 },
          { key: 'wastedPotion', baseSellPrice: 0.8 },
        ],
        herbRows,
        recipes,
        (row) => String(row.key ?? ''),
      ),
    ).toEqual([
      { key: 'manaTonic', baseSellPrice: 76.8 },
      { key: 'minorHealingPotion', baseSellPrice: 80 },
      { key: 'pearlrootDraught', baseSellPrice: 2_368 },
      { key: 'wastedPotion', baseSellPrice: 0.8 },
    ]);
  });

  it('preserves intentional non-legacy potion overrides', () => {
    const storedRows = [{ key: 'manaTonic', baseSellPrice: 56 }];

    expect(
      normalizeLegacyPotionSellPrices(
        storedRows,
        herbRows,
        recipes,
        (row) => String(row.key ?? ''),
      ),
    ).toBe(storedRows);
  });
});

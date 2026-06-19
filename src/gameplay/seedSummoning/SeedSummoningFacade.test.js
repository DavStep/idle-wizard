import { describe, expect, it } from 'vitest';

import { SeedSummoningFacade } from './SeedSummoningFacade.js';

function createFacade({ completedResearchIds = [], seeds = [] } = {}) {
  const completed = new Set(completedResearchIds);

  return new SeedSummoningFacade({
    manaFacade: {
      getSnapshot: () => ({ current: 100 }),
      spend: () => true,
    },
    itemsFacade: {
      getVisibleSummonCost: () => 10,
      getSeedDefinitions: () => seeds,
      addItem: () => {},
    },
    researchFacade: {
      hasCompletedResearch: (researchId) => completed.has(researchId),
    },
  });
}

describe('SeedSummoningFacade', () => {
  it('reports drop chances for unlocked seed drops', () => {
    const facade = createFacade({
      completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      seeds: [
        {
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          dropWeight: 1,
        },
        {
          id: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          dropWeight: 3,
        },
        {
          id: 3,
          key: 'nettleSeed',
          label: 'nettle seed',
          kind: 'seed',
          dropWeight: 5,
        },
      ],
    });

    expect(facade.getSnapshot().dropChances).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        dropWeight: 1,
        dropChance: 0.25,
      },
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        dropWeight: 3,
        dropChance: 0.75,
      },
    ]);
  });

  it('reports no drop chances when no seeds are unlocked', () => {
    const facade = createFacade({
      seeds: [
        {
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          dropWeight: 1,
        },
      ],
    });

    expect(facade.getSnapshot().dropChances).toEqual([]);
  });
});

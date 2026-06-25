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
        baseDropWeight: 1,
        dropPreference: 'medium',
        preferenceWeight: 2,
        dropWeight: 1,
        effectiveDropWeight: 2,
        dropChance: 0.25,
      },
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        baseDropWeight: 3,
        dropPreference: 'medium',
        preferenceWeight: 2,
        dropWeight: 3,
        effectiveDropWeight: 6,
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

  it('initializes sage seed as the medium preference for new accounts', () => {
    const facade = createFacade({
      completedResearchIds: ['unlockSeed:sageSeed'],
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

    facade.initialize();

    expect(facade.getPersistenceSnapshot()).toEqual({
      dropPreferences: {
        sageSeed: 'medium',
      },
    });
    expect(facade.getSnapshot().dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'medium',
      effectiveDropWeight: 2,
      dropChance: 1,
    });
  });

  it('uses player seed drop preferences as weight multipliers', () => {
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
          dropWeight: 1,
        },
      ],
    });

    expect(facade.setSeedDropPreference('sageSeed', 'high')).toMatchObject({
      ok: true,
      preference: 'high',
      weight: 3,
    });
    expect(facade.setSeedDropPreference('mintSeed', 'low')).toMatchObject({
      ok: true,
      preference: 'low',
      weight: 1,
    });

    expect(facade.getSnapshot().dropChances).toMatchObject([
      {
        key: 'sageSeed',
        dropPreference: 'high',
        effectiveDropWeight: 3,
        dropChance: 0.75,
      },
      {
        key: 'mintSeed',
        dropPreference: 'low',
        effectiveDropWeight: 1,
        dropChance: 0.25,
      },
    ]);
  });

  it('does not allow every unlocked seed to be set to none', () => {
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
          dropWeight: 1,
        },
      ],
    });

    expect(facade.setSeedDropPreference('sageSeed', 'none')).toMatchObject({
      ok: true,
    });

    expect(facade.setSeedDropPreference('mintSeed', 'none')).toEqual({
      ok: false,
      reason: 'last_active_seed',
      seedKey: 'mintSeed',
      preference: 'medium',
    });
  });

  it('repairs restored preferences with sage seed at medium when all drops are disabled', () => {
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
          dropWeight: 1,
        },
      ],
    });

    facade.applyPersistenceSnapshot({
      dropPreferences: {
        sageSeed: 'none',
        mintSeed: 'none',
      },
    });

    expect(facade.getSnapshot()).toMatchObject({
      canSummon: true,
      dropChances: [
        {
          key: 'sageSeed',
          dropPreference: 'medium',
          preferenceWeight: 2,
          effectiveDropWeight: 2,
          dropChance: 1,
        },
        {
          key: 'mintSeed',
          dropPreference: 'none',
          effectiveDropWeight: 0,
          dropChance: 0,
        },
      ],
    });
  });

  it('persists drop preferences', () => {
    const facade = createFacade({
      completedResearchIds: ['unlockSeed:sageSeed'],
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

    facade.setSeedDropPreference('sageSeed', 'high');

    const restored = createFacade({
      completedResearchIds: ['unlockSeed:sageSeed'],
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

    restored.applyPersistenceSnapshot(facade.getPersistenceSnapshot());

    expect(restored.getSnapshot().dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'high',
      preferenceWeight: 3,
      effectiveDropWeight: 3,
      dropChance: 1,
    });
  });
});

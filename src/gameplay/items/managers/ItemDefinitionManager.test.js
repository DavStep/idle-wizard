import { describe, expect, it } from 'vitest';

import { ItemDefinitionManager } from './ItemDefinitionManager.js';

describe('ItemDefinitionManager', () => {
  it('knows dormant herb and potion item concepts', () => {
    const manager = new ItemDefinitionManager();

    expect(manager.getHerbDefinitions()).toHaveLength(24);
    expect(manager.getHerbDefinitions()).toContainEqual({
      id: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      growthDurationMs: 12_000,
      baseSellPrice: 6,
      marketGrade: 1,
    });
    expect(manager.getDefinitionByKey('dragonpepperHerb')).toEqual({
      id: 1014,
      key: 'dragonpepperHerb',
      label: 'dragonpepper',
      kind: 'herb',
      growthDurationMs: 210_000,
      baseSellPrice: 52,
      marketGrade: 3,
    });
    expect(manager.getDefinitionByKey('pearlrootHerb')).toEqual({
      id: 1024,
      key: 'pearlrootHerb',
      label: 'pearlroot',
      kind: 'herb',
      growthDurationMs: 520_000,
      baseSellPrice: 328,
      marketGrade: 5,
    });
    expect(manager.getSeedDefinition(1).producesHerbTypeId).toBe(1001);
    expect(manager.getSeedDefinition(14).producesHerbTypeId).toBe(1014);
    expect(manager.getSeedDefinition(24).producesHerbTypeId).toBe(1024);
    expect(manager.getPotionDefinitions()).toHaveLength(39);
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      baseSellPrice: 55,
      marketGrade: 1,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2018,
      key: 'pactWard',
      label: 'pact ward',
      kind: 'potion',
      baseSellPrice: 270,
      marketGrade: 3,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2019,
      key: 'ashenMemory',
      label: 'ashen memory',
      kind: 'potion',
      discoveryType: 'unknown',
      type: 'unknown',
      unknown: true,
      known: false,
      researchable: false,
      baseSellPrice: 130,
      marketGrade: 3,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2029,
      key: 'wastedPotion',
      label: 'wasted potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
      marketGrade: 4,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2039,
      key: 'pearlrootDraught',
      label: 'pearlroot draught',
      kind: 'potion',
      baseSellPrice: 740,
      marketGrade: 5,
    });
    expect(manager.getRecipePotionDefinitions()).toHaveLength(28);
    expect(manager.getUnknownPotionDefinitions()).toHaveLength(10);
    expect(manager.getDefinition(2001).kind).toBe('potion');
  });

  it('defines active ingredients in stable rarity groups', () => {
    const manager = new ItemDefinitionManager();
    const ingredients = manager.getIngredientDefinitions();

    expect(ingredients).toHaveLength(59);
    expect(ingredients[0]).toEqual({
      id: 3001,
      key: 'ratTail',
      label: 'rat tail',
      kind: 'ingredient',
      rarity: 'common',
    });
    expect(manager.getDefinitionByKey('cyclopsEye')).toMatchObject({
      id: 3021,
      kind: 'ingredient',
      rarity: 'rare',
    });
    expect(manager.getDefinitionByKey('featherOfEternity')).toEqual({
      id: 3060,
      key: 'featherOfEternity',
      label: 'feather of eternity',
      kind: 'ingredient',
      rarity: 'mythical',
    });
    expect(
      Object.fromEntries(
        ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].map(
          (rarity) => [
            rarity,
            ingredients.filter((ingredient) => ingredient.rarity === rarity).length,
          ],
        ),
      ),
    ).toEqual({
      common: 10,
      uncommon: 9,
      rare: 10,
      epic: 10,
      legendary: 10,
      mythical: 10,
    });
  });

  it('keeps default ingredients when an older runtime item config omits them', () => {
    const manager = new ItemDefinitionManager();

    manager.setRuntimeConfig({
      seeds: [
        {
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          producesHerbTypeId: 1001,
          dropWeight: 1,
          summonManaCost: 10,
          baseSellPrice: 1,
        },
      ],
      herbs: [
        {
          id: 1001,
          key: 'sageHerb',
          label: 'sage',
          growthDurationMs: 12_000,
          baseSellPrice: 6,
        },
      ],
      potions: [
        {
          id: 2001,
          key: 'manaTonic',
          label: 'mana tonic',
          baseSellPrice: 55,
        },
      ],
    });

    expect(manager.getIngredientDefinitions()).toHaveLength(59);
    expect(manager.getDefinitionByKey('dragonFang').rarity).toBe('epic');
  });

  it('filters the retired living mandrake root from older runtime configs', () => {
    const manager = new ItemDefinitionManager();
    const legacyConfig = manager.createDefinitionsFromConfig({
      seeds: [
        {
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          producesHerbTypeId: 1001,
          dropWeight: 1,
          summonManaCost: 10,
          baseSellPrice: 1,
        },
      ],
      herbs: [
        {
          id: 1001,
          key: 'sageHerb',
          label: 'sage',
          growthDurationMs: 12_000,
          baseSellPrice: 6,
        },
      ],
      potions: [
        {
          id: 2001,
          key: 'manaTonic',
          label: 'mana tonic',
          baseSellPrice: 55,
        },
      ],
      ingredients: [
        {
          id: 3019,
          key: 'livingMandrakeRoot',
          label: 'living mandrake root',
          rarity: 'uncommon',
        },
        {
          id: 3021,
          key: 'cyclopsEye',
          label: 'cyclops eye',
          rarity: 'rare',
        },
      ],
    });

    expect(legacyConfig.ingredientDefinitions).toEqual([
      {
        id: 3021,
        key: 'cyclopsEye',
        label: 'cyclops eye',
        kind: 'ingredient',
        rarity: 'rare',
      },
    ]);
  });
});

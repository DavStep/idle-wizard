import { describe, expect, it } from 'vitest';

import { ItemDefinitionManager } from './ItemDefinitionManager.js';

describe('ItemDefinitionManager', () => {
  it('knows dormant herb and potion item concepts', () => {
    const manager = new ItemDefinitionManager();

    expect(manager.getHerbDefinitions()).toHaveLength(14);
    expect(manager.getHerbDefinitions()).toContainEqual({
      id: 1001,
      key: 'sageHerb',
      label: 'Sage',
      kind: 'herb',
      growthDurationMs: 20_000,
      baseSellPrice: 6,
    });
    expect(manager.getDefinitionByKey('dragonpepperHerb')).toEqual({
      id: 1014,
      key: 'dragonpepperHerb',
      label: 'Dragonpepper',
      kind: 'herb',
      growthDurationMs: 210_000,
      baseSellPrice: 52,
    });
    expect(manager.getSeedDefinition(1).producesHerbTypeId).toBe(1001);
    expect(manager.getSeedDefinition(14).producesHerbTypeId).toBe(1014);
    expect(manager.getPotionDefinitions()).toHaveLength(29);
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      kind: 'potion',
      baseSellPrice: 55,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2018,
      key: 'pactWard',
      label: 'Pact Ward',
      kind: 'potion',
      baseSellPrice: 270,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2019,
      key: 'ashenMemory',
      label: 'Ashen Memory',
      kind: 'potion',
      discoveryType: 'unknown',
      type: 'unknown',
      unknown: true,
      known: false,
      researchable: false,
      baseSellPrice: 130,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2029,
      key: 'wastedPotion',
      label: 'Wasted Potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
    });
    expect(manager.getRecipePotionDefinitions()).toHaveLength(18);
    expect(manager.getUnknownPotionDefinitions()).toHaveLength(10);
    expect(manager.getDefinition(2001).kind).toBe('potion');
  });
});

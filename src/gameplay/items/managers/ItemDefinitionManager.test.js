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
    });
    expect(manager.getDefinitionByKey('dragonpepperHerb')).toEqual({
      id: 1014,
      key: 'dragonpepperHerb',
      label: 'dragonpepper',
      kind: 'herb',
      growthDurationMs: 210_000,
      baseSellPrice: 52,
    });
    expect(manager.getDefinitionByKey('pearlrootHerb')).toEqual({
      id: 1024,
      key: 'pearlrootHerb',
      label: 'pearlroot',
      kind: 'herb',
      growthDurationMs: 520_000,
      baseSellPrice: 328,
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
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2018,
      key: 'pactWard',
      label: 'pact ward',
      kind: 'potion',
      baseSellPrice: 270,
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
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2029,
      key: 'wastedPotion',
      label: 'wasted potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2039,
      key: 'pearlrootDraught',
      label: 'pearlroot draught',
      kind: 'potion',
      baseSellPrice: 740,
    });
    expect(manager.getRecipePotionDefinitions()).toHaveLength(28);
    expect(manager.getUnknownPotionDefinitions()).toHaveLength(10);
    expect(manager.getDefinition(2001).kind).toBe('potion');
  });
});

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
      growthDurationMs: 60_000,
    });
    expect(manager.getDefinitionByKey('dragonpepperHerb')).toEqual({
      id: 1014,
      key: 'dragonpepperHerb',
      label: 'Dragonpepper',
      kind: 'herb',
      growthDurationMs: 60_000,
    });
    expect(manager.getSeedDefinition(1).producesHerbTypeId).toBe(1001);
    expect(manager.getSeedDefinition(14).producesHerbTypeId).toBe(1014);
    expect(manager.getPotionDefinitions()).toHaveLength(18);
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      kind: 'potion',
    });
    expect(manager.getPotionDefinitions()).toContainEqual({
      id: 2018,
      key: 'pactWard',
      label: 'Pact Ward',
      kind: 'potion',
    });
    expect(manager.getDefinition(2001).kind).toBe('potion');
  });
});

import { describe, expect, it } from 'vitest';

import { ItemDefinitionManager } from './ItemDefinitionManager.js';
import { PotionRecipeManager } from './PotionRecipeManager.js';

function createManager() {
  const itemDefinitionManager = new ItemDefinitionManager();
  return new PotionRecipeManager({ itemDefinitionManager });
}

describe('PotionRecipeManager', () => {
  it('knows dormant potion recipes', () => {
    const manager = createManager();

    expect(manager.getPotionRecipes()).toHaveLength(28);
    expect(manager.getPotionRecipe('manaTonic')).toMatchObject({
      potionTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      manaCost: 12,
      brewDurationMs: 30_000,
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
        },
      ],
    });
    expect(manager.getPotionRecipe('pactWard')).toMatchObject({
      potionTypeId: 2018,
      key: 'pactWard',
      label: 'pact ward',
      manaCost: 64,
      brewDurationMs: 145_000,
      ingredients: [
        {
          itemTypeId: 1013,
          key: 'bloodroseHerb',
          label: 'bloodrose',
          kind: 'herb',
          quantity: 1,
        },
        {
          itemTypeId: 1005,
          key: 'briarHerb',
          label: 'briar',
          kind: 'herb',
          quantity: 2,
        },
        {
          itemTypeId: 1010,
          key: 'frostmossHerb',
          label: 'frostmoss',
          kind: 'herb',
          quantity: 1,
        },
      ],
    });
    expect(manager.getPotionRecipe('ashenMemory')).toMatchObject({
      potionTypeId: 2019,
      key: 'ashenMemory',
      label: 'ashen memory',
      discoveryType: 'unknown',
      type: 'unknown',
      unknown: true,
      known: false,
      researchable: false,
      manaCost: 36,
      brewDurationMs: 80_000,
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 1,
        },
        {
          itemTypeId: 1004,
          key: 'lavenderHerb',
          label: 'lavender',
          kind: 'herb',
          quantity: 1,
        },
        {
          itemTypeId: 1010,
          key: 'frostmossHerb',
          label: 'frostmoss',
          kind: 'herb',
          quantity: 1,
        },
      ],
    });
  });

  it('matches recipes by exact ingredient order', () => {
    const manager = createManager();

    expect(manager.getPotionRecipeByIngredientSequence([1001, 1001, 1002])).toMatchObject({
      key: 'minorHealingPotion',
      label: 'minor healing potion',
    });
    expect(manager.getPotionRecipeByIngredientSequence([1001, 1004, 1010])).toMatchObject({
      key: 'ashenMemory',
      label: 'ashen memory',
      unknown: true,
    });
    expect(manager.getPotionRecipeByIngredientSequence([1002, 1001, 1001])).toBeNull();
  });
});

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

    expect(manager.getPotionRecipes()).toHaveLength(18);
    expect(manager.getPotionRecipe('manaTonic')).toEqual({
      potionTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      manaCost: 5,
      brewDurationMs: 4_000,
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
          quantity: 3,
        },
      ],
    });
    expect(manager.getPotionRecipe('pactWard')).toEqual({
      potionTypeId: 2018,
      key: 'pactWard',
      label: 'Pact Ward',
      manaCost: 30,
      brewDurationMs: 18_000,
      ingredients: [
        {
          itemTypeId: 1013,
          key: 'bloodroseHerb',
          label: 'Bloodrose',
          kind: 'herb',
          quantity: 1,
        },
        {
          itemTypeId: 1005,
          key: 'briarHerb',
          label: 'Briar',
          kind: 'herb',
          quantity: 2,
        },
        {
          itemTypeId: 1010,
          key: 'frostmossHerb',
          label: 'Frostmoss',
          kind: 'herb',
          quantity: 1,
        },
      ],
    });
  });
});

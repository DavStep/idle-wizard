// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ingredientCatalog } from '../../../gameplay/items/ingredientCatalog.js';
import { WorkshopBagManager } from './WorkshopBagManager.js';

function createGameplayFacade(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
  };
}

describe('WorkshopBagManager ingredients', () => {
  it('renders the ingredient catalog in six rarity sections with atlas icons', () => {
    const parent = document.createElement('section');
    const snapshot = {
      ingredientInventory: ingredientCatalog.map((ingredient) => ({
        itemTypeId: ingredient.id,
        key: ingredient.key,
        label: ingredient.label,
        kind: 'ingredient',
        rarity: ingredient.rarity,
        quantity: ingredient.key === 'cyclopsEye' ? 2 : 0,
      })),
      inventory: [],
    };
    const manager = new WorkshopBagManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });

    manager.mount(parent);
    manager.show();
    [...parent.querySelectorAll('.workshop-page__bag-tab-button')]
      .find((button) => button.textContent === 'ingredients')
      .click();

    const rarityLabels = [
      ...parent.querySelectorAll('.workshop-page__bag-rarity-divider'),
    ].map((divider) => divider.textContent);
    const rows = [...parent.querySelectorAll('.workshop-page__bag-item-row--ingredient')];
    const cyclopsRow = rows.find((row) => row.querySelector('.row_key')?.textContent === 'cyclops eye');

    expect(rarityLabels).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
      'mythical',
    ]);
    expect(rows).toHaveLength(59);
    expect(cyclopsRow?.dataset.rarity).toBe('rare');
    expect(cyclopsRow?.querySelector('.row_val')?.textContent).toBe('2');
    expect(
      cyclopsRow?.querySelector('.style-ingredient-label__icon')?.dataset.assetAtlasFrame,
    ).toBe('ingredient:cyclopsEye');
  });
});

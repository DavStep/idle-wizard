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

function openTab(parent, label) {
  [...parent.querySelectorAll('.workshop-page__bag-tab-button')]
    .find((button) => button.textContent === label)
    .click();
}

function getRowLabels(parent, kind) {
  return [
    ...parent.querySelectorAll(`.workshop-page__bag-item-row--${kind} .row_key`),
  ].map((label) => label.textContent);
}

describe('WorkshopBagManager', () => {
  it('shows only researched or owned seeds, herbs, and potions', () => {
    const parent = document.createElement('section');
    const snapshot = {
      seedInventory: [
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          quantity: 0,
        },
        {
          itemTypeId: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          quantity: 0,
        },
        {
          itemTypeId: 3,
          key: 'nettleSeed',
          label: 'nettle seed',
          kind: 'seed',
          quantity: 2,
        },
      ],
      garden: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 0,
          },
          {
            itemTypeId: 1002,
            key: 'mintHerb',
            label: 'mint',
            kind: 'herb',
            quantity: 0,
          },
        ],
      },
      brewing: {
        recipes: [
          {
            potionTypeId: 2001,
            key: 'manaTonic',
            label: 'mana tonic',
            kind: 'potion',
            unlocked: true,
          },
          {
            potionTypeId: 2002,
            key: 'minorHealingPotion',
            label: 'minor healing potion',
            kind: 'potion',
            unlocked: false,
          },
        ],
      },
      inventory: [],
      research: {
        completedResearchIds: ['unlockSeed:sageSeed', 'unlockRecipe:manaTonic'],
        boxes: [],
      },
    };
    const manager = new WorkshopBagManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });

    manager.mount(parent);
    manager.show();

    openTab(parent, 'seeds');
    expect(getRowLabels(parent, 'seed')).toEqual(['sage seed', 'nettle seed']);

    openTab(parent, 'herbs');
    expect(getRowLabels(parent, 'herb')).toEqual(['sage']);

    openTab(parent, 'potions');
    expect(getRowLabels(parent, 'potion')).toEqual(['mana tonic']);
    expect(parent.querySelector('.workshop-page__bag-divider')).toBeNull();
  });

  it('shows only owned ingredients in their rarity sections', () => {
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
    openTab(parent, 'ingredients');

    const rarityLabels = [
      ...parent.querySelectorAll('.workshop-page__bag-rarity-divider'),
    ].map((divider) => divider.textContent);
    const rows = [...parent.querySelectorAll('.workshop-page__bag-item-row--ingredient')];
    const cyclopsRow = rows.find((row) => row.querySelector('.row_key')?.textContent === 'cyclops eye');

    expect(rarityLabels).toEqual(['rare']);
    expect(rows).toHaveLength(1);
    expect(cyclopsRow?.dataset.rarity).toBe('rare');
    expect(cyclopsRow?.querySelector('.row_val')?.textContent).toBe('2');
    expect(
      cyclopsRow?.querySelector('.style-ingredient-label__icon')?.dataset.assetAtlasFrame,
    ).toBe('ingredient:cyclopsEye');
  });
});

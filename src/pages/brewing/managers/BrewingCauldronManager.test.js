// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { BrewingCauldronManager } from './BrewingCauldronManager.js';

const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

function createGameplayFacadeFake(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

describe('BrewingCauldronManager', () => {
  it('keeps herb notification dots from resizing the herbs box', () => {
    const herbButtonRule = baseCss.match(
      /\.brewing-page__herb-button\[data-notification="true"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbDotRule = baseCss.match(
      /\.brewing-page__herb-button\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).not.toContain(
      '.brewing-page__herb-rows:has([data-notification="true"])',
    );
    expect(herbButtonRule).toContain('--brewing-page-notification-row-min-height');
    expect(herbButtonRule).toContain(
      'min-height: var(--brewing-page-notification-row-min-height);',
    );
    expect(herbDotRule).toContain('top: calc(');
    expect(herbDotRule).toContain('--brewing-page-notification-row-min-height');
  });

  it('keeps cauldron ingredient quantity prefixes before herb icons', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const label = parent.querySelector('.brewing-page__ingredient-row .row_key');
    const iconLabel = label?.childNodes[1];

    expect(label?.textContent).toBe('- 3 sage');
    expect(label?.childNodes[0]?.textContent).toBe('- 3 ');
    expect(iconLabel?.classList.contains('style-herb-label')).toBe(true);
    expect(label?.querySelector('.style-herb-label__icon')?.dataset.assetAtlasFrame).toBe(
      'herb:sageHerb',
    );

    manager.render(snapshot);

    expect(label?.childNodes[1]).toBe(iconLabel);

    manager.unmount();
    parent.remove();
  });

  it('counts only current-cauldron herbs plus available herbs when showing missing recipe ingredients', () => {
    const manager = new BrewingCauldronManager();
    const recipe = {
      key: 'manaTonic',
      label: 'mana tonic',
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          quantity: 3,
        },
      ],
    };
    const brewing = {
      ingredients: [
        {
          slotIndex: 0,
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
        },
      ],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 1,
        },
      ],
    };

    expect(manager.getMissingIngredientQuantities(recipe, brewing)).toEqual(
      new Map([[1001, 1]]),
    );
  });

  it('marks staged sage remove rows as tutorial targets', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 3, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const removeTarget = parent.querySelector('[data-tutorial-id="brewing:remove:sageHerb"]');

    expect(removeTarget?.classList.contains('brewing-page__ingredient-row')).toBe(true);
    expect(removeTarget?.textContent).toBe('- 4 sageremove');

    manager.unmount();
    parent.remove();
  });

  it('marks selected-recipe extra sage guide rows as tutorial targets', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
            availableQuantity: 0,
          },
        ],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 3, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 5,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: true,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const removeTargets = [
      ...parent.querySelectorAll('[data-tutorial-id="brewing:remove:sageHerb"]'),
    ];

    expect(removeTargets).toHaveLength(1);
    expect(removeTargets[0].classList.contains('brewing-page__cauldron-guide-step')).toBe(
      true,
    );
    expect(removeTargets[0].textContent).toBe('- 1 sageremove');

    manager.unmount();
    parent.remove();
  });

  it('offers fill recipe when a remembered recipe can be staged into an empty cauldron', () => {
    const manager = new BrewingCauldronManager();
    const brewing = {
      ingredients: [],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 3,
        },
      ],
      selectedRecipe: {
        key: 'manaTonic',
        label: 'mana tonic',
        ingredients: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            quantity: 3,
          },
        ],
      },
      match: null,
      canBrew: false,
      manaCost: 12,
      activeBrew: null,
    };

    expect(manager.getPrimaryAction(brewing)).toMatchObject({
      id: 'fill',
      label: 'fill recipe',
      disabled: false,
      hasCost: false,
      ariaLabel: 'fill mana tonic recipe',
    });
  });

  it('does not offer fill recipe while the cauldron has an active brew', () => {
    const manager = new BrewingCauldronManager();
    const brewing = {
      ingredients: [],
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 3,
          availableQuantity: 3,
        },
      ],
      selectedRecipe: {
        key: 'manaTonic',
        label: 'mana tonic',
        ingredients: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            quantity: 3,
          },
        ],
      },
      match: null,
      canBrew: false,
      manaCost: 12,
      activeBrew: {
        key: 'manaTonic',
        label: 'mana tonic',
        phase: 'brewing',
        canStartBottling: false,
        canCollect: false,
      },
    };

    expect(manager.getPrimaryAction(brewing)).toMatchObject({
      id: 'brew',
      label: 'brew',
      disabled: true,
      hasCost: false,
    });
    expect(manager.canFillSelectedRecipe(brewing)).toBe(false);
  });

  it('reuses the fixed cauldron content slot while brewing is active', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        selectedRecipe: null,
        match: null,
        canAddIngredient: false,
        canBrew: false,
        activeBrew: {
          key: 'manaTonic',
          label: 'mana tonic',
          phase: 'brewing',
          canStartBottling: false,
          canCollect: false,
          remainingMs: 28_000,
          totalMs: 30_000,
          bottlingTotalMs: 2_000,
          progress: 0.1,
        },
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);

    const items = parent.querySelector('.brewing-page__cauldron-items');
    const active = parent.querySelector('.brewing-page__active-brew');

    expect(items?.hidden).toBe(true);
    expect(active?.hidden).toBe(false);
    expect(active?.textContent).toContain('brewing mana tonic');

    snapshot.brewing.activeBrew = null;
    snapshot.brewing.canAddIngredient = true;
    manager.render(snapshot);

    expect(items?.hidden).toBe(false);
    expect(active?.hidden).toBe(true);

    manager.unmount();
    parent.remove();
  });
});

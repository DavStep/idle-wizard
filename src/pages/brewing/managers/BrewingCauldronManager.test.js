// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { BrewingCauldronManager } from './BrewingCauldronManager.js';
import { TIMER_PROGRESS_STEP_MS } from '../../shared/timerDisplay.js';

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
  it('adds herbs by click without exposing drag/drop affordances', () => {
    const addCalls = [];
    const snapshot = {
      brewing: {
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
        ingredients: [],
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
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        addBrewingIngredient: (itemTypeId, cauldronIndex) => {
          addCalls.push([itemTypeId, cauldronIndex]);
          return { ok: true };
        },
      },
    });

    manager.mount(parent);

    const herbButton = parent.querySelector('.brewing-page__herb-button');

    expect(herbButton.draggable).toBe(false);

    herbButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(addCalls).toEqual([[1001, 0]]);

    manager.unmount();
    parent.remove();
  });

  it('anchors herb notification dots to the herb name instead of the quantity edge', () => {
    const herbLabelRule = baseCss.match(
      /\.brewing-page__herb-label\[data-notification="true"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbDotRule = baseCss.match(
      /\.brewing-page__herb-label\[data-notification="true"\]::before\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).not.toContain(
      '.brewing-page__herb-rows:has([data-notification="true"])',
    );
    expect(herbLabelRule).toContain('position: relative;');
    expect(herbDotRule).toContain('right: calc(-1 * var(--style-notification-size));');
    expect(herbDotRule).not.toContain('--brewing-page-notification-row-min-height');
  });

  it('puts active herb notification state on the herb label', () => {
    const snapshot = {
      brewing: {
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
        ingredients: [],
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

    const button = parent.querySelector('.brewing-page__herb-button');
    const label = parent.querySelector('.brewing-page__herb-label');

    expect(button?.dataset.notification).toBeUndefined();
    expect(label?.dataset.notification).toBe('true');

    manager.unmount();
    parent.remove();
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

  it('labels the recipe opener as change recipe only after a recipe is selected', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
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
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = null;
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => selectedRecipeKey,
    });

    manager.mount(parent);

    const button = parent.querySelector('.brewing-page__cauldron-select-recipe-text');

    expect(button?.textContent).toBe('select recipe');
    expect(button?.getAttribute('aria-label')).toBe('open select recipe for cauldron 1');

    selectedRecipeKey = 'manaTonic';
    manager.render(snapshot);

    expect(button?.textContent).toBe('change recipe');
    expect(button?.getAttribute('aria-label')).toBe('open change recipe for cauldron 1');

    selectedRecipeKey = null;
    manager.render(snapshot);

    expect(button?.textContent).toBe('select recipe');
    expect(button?.getAttribute('aria-label')).toBe('open select recipe for cauldron 1');

    manager.unmount();
    parent.remove();
  });

  it('renders the selected recipe potion icon inside the cauldron', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
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
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const icon = parent.querySelector('.brewing-page__cauldron-potion-icon');
    const image = parent.querySelector('.brewing-page__cauldron-potion-icon-image');

    expect(cauldron?.classList.contains('has-potion-icon')).toBe(true);
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.potionIconKey).toBe('manaTonic');
    expect(image?.dataset.assetAtlasFrame).toBe('potion:manaTonic');

    manager.unmount();
    parent.remove();
  });

  it('puts the selected recipe name on the cauldron top line', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
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
        manaCost: 12,
        activeBrew: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => 'manaTonic',
    });

    manager.mount(parent);

    const title = parent.querySelector('.brewing-page__cauldron-recipe-title');
    const guide = parent.querySelector('.brewing-page__cauldron-guide');
    const items = parent.querySelector('.brewing-page__cauldron-items');

    expect(title?.textContent).toBe('mana tonic');
    expect(title?.hidden).toBe(false);
    expect(guide?.querySelector('.brewing-page__cauldron-recipe-row')).toBeNull();
    expect(guide?.textContent).not.toContain('recipe');
    expect(guide?.textContent).toContain('- 3 sage');
    expect(items?.hidden).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('keeps selected recipe guide rows out of an inner scroll pane', () => {
    const guideSequenceRule = baseCss.match(
      /\.brewing-page__cauldron-guide-sequence\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(guideSequenceRule).toContain(
      'min-height: var(--brewing-page-cauldron-scroll-height);',
    );
    expect(guideSequenceRule).toContain('overflow: visible;');
    expect(guideSequenceRule).not.toContain('overflow: hidden auto;');
  });

  it('keeps the change-recipe label above the selected recipe guide layer', () => {
    const selectRecipeRule = baseCss.match(
      /\.style-box \.brewing-page__cauldron-select-recipe-text\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const guideRule = baseCss.match(
      /\.brewing-page__cauldron-guide\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(selectRecipeRule).toContain('z-index: 2;');
    expect(guideRule).toContain('z-index: 1;');
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
    const activeProgressFill = parent.querySelector('.brewing-page__active-progress-fill');
    const icon = parent.querySelector('.brewing-page__cauldron-potion-icon');

    expect(items?.hidden).toBe(true);
    expect(active?.hidden).toBe(false);
    expect(active?.textContent).toContain('brewing mana tonic');
    expect(activeProgressFill?.classList.contains('is-progress-running')).toBe(false);
    expect(activeProgressFill?.style.transition).toBe(
      `transform ${TIMER_PROGRESS_STEP_MS}ms linear`,
    );
    expect(icon?.hidden).toBe(false);
    expect(icon?.dataset.potionIconKey).toBe('manaTonic');

    snapshot.brewing.activeBrew = null;
    snapshot.brewing.canAddIngredient = true;
    manager.render(snapshot);

    expect(items?.hidden).toBe(false);
    expect(active?.hidden).toBe(true);
    expect(icon?.hidden).toBe(true);

    manager.unmount();
    parent.remove();
  });
});

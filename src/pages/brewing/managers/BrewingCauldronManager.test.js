// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

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
  it('opens the cauldron dialog when a world cauldron is pressed', () => {
    const snapshot = {
      brewing: {
        herbs: [],
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
    const onOpenSelectRecipe = vi.fn();
    const manager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      onOpenSelectRecipe,
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__cauldron')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onOpenSelectRecipe).toHaveBeenCalledWith(0);

    manager.unmount();
    parent.remove();
  });

  it('rubber-bands world panning outside the borders and snaps back on release', () => {
    const snapshot = {
      brewing: {
        herbs: [],
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

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: 200, height: 200 }),
    });

    shell.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 100,
      }),
    );
    shell.dispatchEvent(
      new window.MouseEvent('pointermove', {
        bubbles: true,
        clientX: -500,
        clientY: -600,
      }),
    );

    const world = parent.querySelector('.brewing-page__world');
    const rubberPanX = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-pan-x'),
    );
    const rubberPanY = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-pan-y'),
    );

    expect(rubberPanX).toBeLessThan(-360);
    expect(rubberPanX).toBeGreaterThan(-414);
    expect(rubberPanY).toBeLessThan(-520);
    expect(rubberPanY).toBeGreaterThan(-574);

    shell.dispatchEvent(
      new window.MouseEvent('pointerup', {
        bubbles: true,
        clientX: -500,
        clientY: -600,
      }),
    );

    expect(world.style.getPropertyValue('--brewing-page-world-pan-x')).toBe('-360px');
    expect(world.style.getPropertyValue('--brewing-page-world-pan-y')).toBe('-520px');
    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('1');
    expect(world.classList.contains('is-settling')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('rubber-bands world zoom outside the caps and snaps back on release', () => {
    const snapshot = {
      brewing: {
        herbs: [],
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

    const shell = parent.querySelector('.brewing-page__world-shell');
    Object.defineProperty(shell, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    });

    manager.setWorldZoomAroundPoint(0.3, 100, 100, { rubber: true });

    const world = parent.querySelector('.brewing-page__world');
    const rubberZoom = Number.parseFloat(
      world.style.getPropertyValue('--brewing-page-world-zoom'),
    );

    expect(rubberZoom).toBeLessThan(0.68);
    expect(rubberZoom).toBeGreaterThan(0.56);

    manager.settleWorldViewport();

    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('0.68');
    expect(world.classList.contains('is-settling')).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('does not zoom the world from wheel input', () => {
    const snapshot = {
      brewing: {
        herbs: [],
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

    const shell = parent.querySelector('.brewing-page__world-shell');
    const world = parent.querySelector('.brewing-page__world');
    const wheelEvent = new window.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
      deltaY: -120,
    });

    shell.dispatchEvent(wheelEvent);

    expect(world.style.getPropertyValue('--brewing-page-world-zoom')).toBe('1');
    expect(wheelEvent.defaultPrevented).toBe(false);

    manager.unmount();
    parent.remove();
  });

  it('extends the world shell down to the chat clearance behind the herb tray', () => {
    const worldViewRule = baseCss.match(
      /\.brewing-page__world-view\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const shellRule = baseCss.match(
      /\.brewing-page__world-shell\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbsRule = baseCss.match(
      /\.brewing-page__herbs\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(worldViewRule).toContain('--brewing-page-world-bottom-offset: 6px;');
    expect(shellRule).toContain('bottom: var(--brewing-page-world-bottom-offset);');
    expect(shellRule).not.toContain('bottom: 82px;');
    expect(shellRule).toContain('z-index: 0;');
    expect(herbsRule).toContain('z-index: 1;');
  });

  it('adds dragged herbs to the cauldron dropped under the pointer', () => {
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
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            selectedRecipe: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
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
    const cauldron = parent.querySelector('.brewing-page__cauldron');
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => cauldron);

    herbButton.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 10,
        clientY: 10,
      }),
    );
    herbButton.dispatchEvent(
      new window.MouseEvent('pointermove', {
        bubbles: true,
        clientX: 40,
        clientY: 40,
      }),
    );
    herbButton.dispatchEvent(
      new window.MouseEvent('pointerup', {
        bubbles: true,
        clientX: 40,
        clientY: 40,
      }),
    );

    expect(addCalls).toEqual([[1001, 0]]);
    expect(document.querySelector('.brewing-page__herb-drag-ghost')).toBeNull();

    document.elementFromPoint = originalElementFromPoint;
    manager.unmount();
    parent.remove();
  });

  it('keeps herb click add as a fallback when not dragging', () => {
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

  it('multiplies missing recipe ingredients by selected brew quantity', () => {
    const manager = new BrewingCauldronManager();
    const recipe = {
      key: 'twoHerbPotion',
      label: 'two herb potion',
      ingredients: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          quantity: 3,
        },
        {
          itemTypeId: 1003,
          key: 'nettleHerb',
          label: 'nettle',
          quantity: 1,
        },
      ],
    };
    const brewing = {
      brewQuantity: 3,
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
          quantity: 6,
          availableQuantity: 5,
        },
        {
          itemTypeId: 1003,
          key: 'nettleHerb',
          label: 'nettle',
          kind: 'herb',
          quantity: 1,
          availableQuantity: 1,
        },
      ],
    };

    expect(manager.getMissingIngredientQuantities(recipe, brewing)).toEqual(
      new Map([
        [1001, 3],
        [1003, 2],
      ]),
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

  it('shows cauldron stars in the cauldron title after emerald upgrades', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [],
        maxIngredients: 5,
        manaCost: 12,
        level: 1,
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

    const title = parent.querySelector('.brewing-page__cauldron .style-box__title');
    expect(title?.textContent).toBe('cauldron 1');
    expect(title?.getAttribute('aria-label')).toBe('cauldron 1 0 stars');
    expect(title?.querySelector('.style-star-level')).toBeNull();

    snapshot.brewing.level = 3;
    manager.render(snapshot);

    const star = title?.querySelector('.style-star-level');

    expect(title?.textContent).toBe('cauldron 1 ★★');
    expect(title?.getAttribute('aria-label')).toBe('cauldron 1 yellow star 2');
    expect(star?.dataset.starTone).toBe('yellow');

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

  it('keeps the selected recipe name out of the cauldron top line', () => {
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

    const guide = parent.querySelector('.brewing-page__cauldron-guide');
    const items = parent.querySelector('.brewing-page__cauldron-items');

    expect(parent.querySelector('.brewing-page__cauldron-recipe-title')).toBeNull();
    expect(
      parent.querySelector('.brewing-page__cauldron .style-box__title')?.textContent,
    ).toBe('cauldron 1');
    expect(guide?.querySelector('.brewing-page__cauldron-recipe-row')).toBeNull();
    expect(guide?.textContent).not.toContain('recipe');
    expect(guide?.textContent).toContain('- 3 sage');
    expect(items?.hidden).toBe(true);

    manager.unmount();
    parent.remove();
  });

  it('shows exact xN recipe requirements in the cauldron guide', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 9,
            availableQuantity: 9,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 3,
            availableQuantity: 3,
          },
        ],
        ingredients: [],
        recipes: [
          {
            key: 'sageNettle',
            label: 'sage nettle',
            unlocked: true,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
              {
                itemTypeId: 1003,
                key: 'nettleHerb',
                label: 'nettle',
                quantity: 1,
              },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 36,
        brewQuantity: 3,
        maxBrewQuantity: 3,
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
      getSelectedRecipeKey: () => 'sageNettle',
    });

    manager.mount(parent);

    const labels = [...parent.querySelectorAll('.brewing-page__cauldron-guide-step .row_key')].map(
      (row) => row.textContent,
    );

    expect(labels).toEqual(['- 3 x 3 sage', '- 3 x 1 nettle']);

    manager.unmount();
    parent.remove();
  });

  it('shows selected brew quantity on the brew action', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 1, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
          { slotIndex: 2, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [],
        maxIngredients: 5,
        manaCost: 36,
        brewQuantity: 3,
        maxBrewQuantity: 3,
        activeBrew: null,
        match: {
          key: 'manaTonic',
          label: 'mana tonic',
          unlocked: true,
        },
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

    expect(parent.querySelector('.brewing-page__action-button-label')?.textContent.trim()).toBe(
      'brew x3',
    );
    expect(parent.querySelector('.brewing-page__action-button-cost')?.textContent).toBe(
      '(36 mana)',
    );
    expect(parent.querySelector('.brewing-page__action-button')?.getAttribute('aria-label')).toBe(
      'brew 3 mana tonic, costs 36 mana',
    );

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

  it('keeps three cauldron rows by default and grows for taller selected recipes', () => {
    expect(baseCss).toContain('--brewing-page-cauldron-base-row-count: 3;');
    expect(baseCss).toContain(
      'var(--style-row-min-height) * var(--brewing-page-cauldron-list-row-count)',
    );

    const baseSnapshot = {
      brewing: {
        herbs: [],
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
    const baseParent = document.createElement('div');
    document.body.append(baseParent);
    const baseManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(baseSnapshot),
    });

    baseManager.mount(baseParent);

    expect(
      baseParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-row-count'),
    ).toBe('3');

    baseManager.unmount();
    baseParent.remove();

    const recipeSnapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'manyRows',
            label: 'many rows',
            unlocked: true,
            ingredients: [
              { itemTypeId: 1001, key: 'sageHerb', label: 'sage', quantity: 1 },
              { itemTypeId: 1002, key: 'mintHerb', label: 'mint', quantity: 1 },
              { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle', quantity: 1 },
              { itemTypeId: 1004, key: 'briarHerb', label: 'briar', quantity: 1 },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const recipeParent = document.createElement('div');
    document.body.append(recipeParent);
    const recipeManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(recipeSnapshot),
      getSelectedRecipeKey: () => 'manyRows',
    });

    recipeManager.mount(recipeParent);

    expect(
      recipeParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-row-count'),
    ).toBe('4');
    expect(
      recipeParent
        .querySelector('.brewing-page__cauldron')
        ?.style.getPropertyValue('--brewing-page-cauldron-list-row-count'),
    ).toBe('4');

    recipeManager.unmount();
    recipeParent.remove();

    const statusSnapshot = {
      brewing: {
        herbs: [],
        ingredients: [
          { slotIndex: 0, itemTypeId: 1001, key: 'sageHerb', label: 'sage', kind: 'herb' },
        ],
        recipes: [
          {
            key: 'statusRows',
            label: 'status rows',
            unlocked: true,
            ingredients: [
              { itemTypeId: 1001, key: 'sageHerb', label: 'sage', quantity: 1 },
              { itemTypeId: 1002, key: 'mintHerb', label: 'mint', quantity: 1 },
              { itemTypeId: 1003, key: 'nettleHerb', label: 'nettle', quantity: 1 },
            ],
          },
        ],
        maxIngredients: 5,
        manaCost: 12,
        activeBrew: null,
        selectedRecipe: null,
        match: null,
        canAddIngredient: true,
        canBrew: false,
      },
    };
    const statusParent = document.createElement('div');
    document.body.append(statusParent);
    const statusManager = new BrewingCauldronManager({
      gameplayFacade: createGameplayFacadeFake(statusSnapshot),
      getSelectedRecipeKey: () => 'statusRows',
    });

    statusManager.mount(statusParent);

    const statusCauldron = statusParent.querySelector('.brewing-page__cauldron');
    expect(statusCauldron?.style.getPropertyValue('--brewing-page-cauldron-row-count')).toBe(
      '4',
    );
    expect(
      statusCauldron?.style.getPropertyValue('--brewing-page-cauldron-list-row-count'),
    ).toBe('3');

    statusManager.unmount();
    statusParent.remove();
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
    const frameCallbacks = [];

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
    });

    manager.mount(parent);

    const items = parent.querySelector('.brewing-page__cauldron-items');
    const active = parent.querySelector('.brewing-page__active-brew');
    const activeProgressFill = parent.querySelector('.brewing-page__active-progress-fill');
    const icon = parent.querySelector('.brewing-page__cauldron-potion-icon');

    expect(items?.hidden).toBe(true);
    expect(active?.hidden).toBe(false);
    expect(active?.textContent).toContain('brewing mana tonic');
    expect(activeProgressFill?.style.transform).toBe('scaleX(0.0667)');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(activeProgressFill?.classList.contains('is-progress-running')).toBe(true);
    expect(activeProgressFill?.style.transition).toBe('transform 28000ms linear');
    expect(activeProgressFill?.style.transform).toBe('scaleX(1)');
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

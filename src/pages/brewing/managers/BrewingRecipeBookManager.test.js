// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { BrewingRecipeBookManager } from './BrewingRecipeBookManager.js';

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

function createSnapshot() {
  return {
    brewing: {
      herbs: [
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
          quantity: 1,
        },
      ],
      recipes: [
        {
          key: 'minorHealingPotion',
          label: 'minor healing potion',
          unlocked: true,
          manaCost: 10,
          brewDurationMs: 10_000,
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'sage',
              quantity: 1,
            },
          ],
        },
      ],
    },
  };
}

describe('BrewingRecipeBookManager', () => {
  it('keeps the recipe book as a fixed two-page spread', () => {
    const dialogRule = baseCss.match(
      /\.style-dialog\.brewing-page__recipes-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const bookRule = baseCss.match(
      /\.brewing-page__recipe-book\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const pageRule = baseCss.match(
      /\n\.brewing-page__recipe-page\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dialogRule).toBeDefined();
    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).toMatch(
      /\bheight:\s*var\(--brewing-page-cauldron-dialog-content-height\);/,
    );

    expect(bookRule).toBeDefined();
    expect(bookRule).toMatch(/\bdisplay:\s*grid;/);
    expect(bookRule).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);');
    expect(bookRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(bookRule).toMatch(/\bmin-height:\s*0;/);

    expect(pageRule).toBeDefined();
    expect(pageRule).toMatch(/\boverflow:\s*hidden auto;/);
  });

  it('keeps the cauldron dialog brew action inside the popup panel', () => {
    const rule = baseCss.match(
      /\.style-button\.brewing-page__dialog-action-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rule).toBeDefined();
    expect(rule).toMatch(/\bbox-sizing:\s*border-box;/);
    expect(rule).toMatch(/\bwidth:\s*100%;/);
    expect(rule).toMatch(/\bmax-width:\s*100%;/);
  });

  it('shows selected recipe action as selected', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => 'minorHealingPotion',
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const row = parent.querySelector('.brewing-page__recipe-row');
    const action = row.querySelector('.brewing-page__recipe-select-button');

    expect(row.tagName).toBe('DIV');
    expect(action.textContent).toBe('[x]');
    expect(action.getAttribute('aria-pressed')).toBe('true');
    expect(action.getAttribute('aria-label')).toBe(
      'unselect minor healing potion recipe',
    );
    expect(row.getAttribute('aria-pressed')).toBe('true');

    manager.unmount();
    parent.remove();
  });

  it('marks the recipe popup close button as the tutorial close target', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__recipes-close')?.dataset.tutorialId).toBe(
      'brewing:recipes:close',
    );

    manager.unmount();
    parent.remove();
  });

  it('shows the current cauldron in the recipe popup title', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    let cauldronIndex = 1;
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => null,
      getCurrentCauldronIndex: () => cauldronIndex,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'recipes: cauldron 2',
    );
    expect(parent.querySelector('.brewing-page__recipes-dialog')?.getAttribute('aria-label')).toBe(
      'recipes: cauldron 2',
    );

    cauldronIndex = 2;
    manager.render(createSnapshot());

    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'recipes: cauldron 3',
    );

    manager.unmount();
    parent.remove();
  });

  it('selects a recipe when the recipe action is clicked', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = null;
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => selectedRecipeKey,
      onSelectRecipe: (recipe) => {
        selectedRecipeKey = recipe.key;
      },
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedRecipeKey).toBe('minorHealingPotion');
    expect(parent.querySelector('.brewing-page__recipe-row').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(parent.querySelector('.brewing-page__recipe-select-button').textContent).toBe(
      '[x]',
    );

    manager.unmount();
    parent.remove();
  });

  it('reserves recipe select space so checkbox text does not shift the entry', () => {
    const headerRule = baseCss.match(
      /\.brewing-page__recipe-header\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const selectRule = baseCss.match(
      /\.brewing-page__recipe-select-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(headerRule).toContain('grid-template-columns: 24px minmax(0, 1fr);');
    expect(selectRule).toContain('width: 24px;');
    expect(selectRule).toContain('min-width: 24px;');
    expect(selectRule).toContain('white-space: nowrap;');
  });

  it('unselects a selected recipe when the recipe action is clicked', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    let selectedRecipeKey = 'minorHealingPotion';
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(createSnapshot()),
      getSelectedRecipeKey: () => selectedRecipeKey,
      onSelectRecipe: (recipe) => {
        selectedRecipeKey = recipe?.key ?? null;
      },
    });

    manager.mount(parent);

    parent
      .querySelector('.brewing-page__recipe-select-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedRecipeKey).toBeNull();
    expect(parent.querySelector('.brewing-page__recipe-row').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(parent.querySelector('.brewing-page__recipe-select-button').textContent).toBe(
      '[ ]',
    );

    manager.unmount();
    parent.remove();
  });

  it('enables auto brew for the current cauldron only', () => {
    const snapshot = createSnapshot();
    snapshot.research = {
      completedResearchIds: ['automation:autoBrewCauldron:2'],
    };
    snapshot.brewing.cauldrons = [
      {
        cauldronIndex: 0,
        cauldronNumber: 1,
        autoBrewEnabled: true,
        autoBrewRecipeKey: 'manaTonic',
      },
      {
        cauldronIndex: 1,
        cauldronNumber: 2,
        autoBrewEnabled: false,
        autoBrewRecipeKey: null,
      },
    ];
    const parent = document.createElement('div');
    document.body.append(parent);
    const setBrewingAutoBrewRecipe = vi.fn((recipeKey, cauldronIndex) => {
      snapshot.brewing.cauldrons[cauldronIndex].autoBrewRecipeKey = recipeKey;
      return { ok: true };
    });
    const setBrewingAutoBrewEnabled = vi.fn((enabled, cauldronIndex) => {
      snapshot.brewing.cauldrons[cauldronIndex].autoBrewEnabled = enabled === true;
      return { ok: true };
    });
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: {
        ...createGameplayFacadeFake(snapshot),
        setBrewingAutoBrewRecipe,
        setBrewingAutoBrewEnabled,
      },
      getSelectedRecipeKey: () => 'minorHealingPotion',
      getCurrentCauldronIndex: () => 1,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const stateButton = parent.querySelector('.brewing-page__auto-state-button');
    expect(parent.querySelector('.brewing-page__auto-summary')?.hidden).toBe(false);
    expect(stateButton.disabled).toBe(false);
    expect(stateButton.textContent).toBe('disabled');

    stateButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(setBrewingAutoBrewRecipe).toHaveBeenCalledWith('minorHealingPotion', 1);
    expect(setBrewingAutoBrewEnabled).toHaveBeenCalledWith(true, 1);
    expect(snapshot.brewing.cauldrons[0]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(snapshot.brewing.cauldrons[1]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'minorHealingPotion',
    });

    manager.unmount();
    parent.remove();
  });

  it('shows required and owned ingredient quantities in recipe rows', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 1,
          },
          {
            itemTypeId: 1005,
            key: 'briarHerb',
            label: 'briar',
            kind: 'herb',
            quantity: 7,
          },
        ],
        recipes: [
          {
            key: 'briarWard',
            label: 'briar ward',
            unlocked: true,
            manaCost: 24,
            brewDurationMs: 60_000,
            ingredients: [
              {
                itemTypeId: 1005,
                key: 'briarHerb',
                label: 'briar',
                quantity: 2,
              },
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 2,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    const ingredients = [...parent.querySelectorAll('.brewing-page__recipe-ingredient-row')].map(
      (row) => ({
        required: row.querySelector('.brewing-page__recipe-ingredient-required')?.textContent,
        owned: row.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
        unavailable: row
          .querySelector('.brewing-page__recipe-ingredient-required')
          ?.classList.contains('is-unavailable'),
      }),
    );

    expect(ingredients).toEqual([
      { required: '- 2 briar', owned: 'owned 7', unavailable: false },
      { required: '- 2 sage', owned: 'owned 1', unavailable: true },
    ]);
    const required = parent.querySelector('.brewing-page__recipe-ingredient-required');

    expect(required?.childNodes[0]?.textContent).toBe('- 2 ');
    expect(required?.childNodes[1]?.classList.contains('style-herb-label')).toBe(true);
    expect(required?.querySelector('.style-herb-label__icon')).not.toBeNull();

    snapshot.brewing.herbs[1].quantity = 8;
    manager.render(snapshot);

    expect(
      parent
        .querySelector('.brewing-page__recipe-ingredient-row')
        ?.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
    ).toBe('owned 8');

    manager.unmount();
    parent.remove();
  });

  it('shows two recipes on each book page and turns to the next spread', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 4,
          },
          {
            itemTypeId: 1002,
            key: 'mintHerb',
            label: 'mint',
            kind: 'herb',
            quantity: 3,
          },
        ],
        recipes: [
          {
            key: 'manaTonic',
            label: 'mana tonic',
            unlocked: true,
            manaCost: 12,
            brewDurationMs: 10_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 3,
              },
            ],
          },
          {
            key: 'minorHealingPotion',
            label: 'minor healing potion',
            unlocked: true,
            manaCost: 15,
            brewDurationMs: 20_000,
            ingredients: [
              {
                itemTypeId: 1002,
                key: 'mintHerb',
                label: 'mint',
                quantity: 2,
              },
            ],
          },
          {
            key: 'nettleVigor',
            label: 'nettle vigor',
            unlocked: true,
            manaCost: 16,
            brewDurationMs: 25_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 1,
              },
            ],
          },
          {
            key: 'calmingDraught',
            label: 'calming draught',
            unlocked: true,
            manaCost: 18,
            brewDurationMs: 30_000,
            ingredients: [
              {
                itemTypeId: 1002,
                key: 'mintHerb',
                label: 'mint',
                quantity: 1,
              },
            ],
          },
          {
            key: 'briarWard',
            label: 'briar ward',
            unlocked: true,
            manaCost: 24,
            brewDurationMs: 60_000,
            ingredients: [
              {
                itemTypeId: 1001,
                key: 'sageHerb',
                label: 'sage',
                quantity: 1,
              },
            ],
          },
        ],
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      onSelectRecipe: () => {},
    });

    manager.mount(parent);

    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-page')].map((page) =>
        [...page.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
          row.querySelector('.brewing-page__recipe-name')?.textContent,
        ),
      ),
    ).toEqual([
      ['mana tonic', 'minor healing potion'],
      ['nettle vigor', 'calming draught'],
    ]);
    expect(parent.querySelector('.brewing-page__recipe-page-label')?.textContent).toBe(
      'pages 1-2/3',
    );

    parent
      .querySelector('.brewing-page__recipe-page-button:last-child')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-row')].map((row) =>
        row.querySelector('.brewing-page__recipe-name')?.textContent,
      ),
    ).toEqual(['briar ward']);
    expect(parent.querySelector('.brewing-page__recipe-page-label')?.textContent).toBe(
      'page 3/3',
    );

    manager.unmount();
    parent.remove();
  });

  it('shows selected brew quantity and multiplies recipe costs and ingredients', () => {
    const snapshot = {
      brewing: {
        herbs: [
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 9,
          },
          {
            itemTypeId: 1003,
            key: 'nettleHerb',
            label: 'nettle',
            kind: 'herb',
            quantity: 3,
          },
        ],
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            level: 3,
            maxBrewQuantity: 3,
            brewQuantity: 3,
          },
        ],
        recipes: [
          {
            key: 'sageNettle',
            label: 'sage nettle',
            unlocked: true,
            manaCost: 12,
            brewDurationMs: 30_000,
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
      },
    };
    const parent = document.createElement('div');
    document.body.append(parent);
    const onSelectBrewQuantity = vi.fn((quantity) => {
      snapshot.brewing.cauldrons[0].brewQuantity = quantity;
    });
    const manager = new BrewingRecipeBookManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
      getSelectedRecipeKey: () => null,
      getCurrentCauldronIndex: () => 0,
      onSelectRecipe: () => {},
      onSelectBrewQuantity,
    });

    manager.mount(parent);

    expect(parent.querySelector('.brewing-page__quantity-summary')?.hidden).toBe(false);
    expect(
      [...parent.querySelectorAll('.brewing-page__quantity-button')].map((button) => ({
        text: button.textContent,
        pressed: button.getAttribute('aria-pressed'),
      })),
    ).toEqual([
      { text: 'x1', pressed: 'false' },
      { text: 'x2', pressed: 'false' },
      { text: 'x3', pressed: 'true' },
    ]);

    expect(parent.querySelector('.brewing-page__recipe-cost')?.textContent).toBe(
      '36 mana required',
    );
    expect(
      [...parent.querySelectorAll('.brewing-page__recipe-ingredient-row')].map((row) => ({
        required: row.querySelector('.brewing-page__recipe-ingredient-required')?.textContent,
        owned: row.querySelector('.brewing-page__recipe-ingredient-owned')?.textContent,
      })),
    ).toEqual([
      { required: '- 3 x 3 sage', owned: 'owned 9' },
      { required: '- 3 x 1 nettle', owned: 'owned 3' },
    ]);

    parent
      .querySelector('.brewing-page__quantity-button[data-brew-quantity="1"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onSelectBrewQuantity).toHaveBeenCalledWith(1, 0);
    expect(parent.querySelector('.brewing-page__recipe-cost')?.textContent).toBe(
      '12 mana required',
    );

    manager.unmount();
    parent.remove();
  });
});

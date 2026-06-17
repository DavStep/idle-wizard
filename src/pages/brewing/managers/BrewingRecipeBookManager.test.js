// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { BrewingRecipeBookManager } from './BrewingRecipeBookManager.js';

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

    expect(row.tagName).toBe('BUTTON');
    expect(action.textContent).toBe('selected');
    expect(row.getAttribute('aria-pressed')).toBe('true');
    expect(row.getAttribute('aria-label')).toBe('unselect minor healing potion recipe');

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
      'select recipe: cauldron 2',
    );
    expect(parent.querySelector('.brewing-page__recipes-dialog')?.getAttribute('aria-label')).toBe(
      'select recipe: cauldron 2',
    );

    cauldronIndex = 2;
    manager.render(createSnapshot());

    expect(parent.querySelector('.style-box__title')?.textContent).toBe(
      'select recipe: cauldron 3',
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
      'selected',
    );

    manager.unmount();
    parent.remove();
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
      'select',
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
      }),
    );

    expect(ingredients).toEqual([
      { required: '- 2 briar', owned: 'owned 7' },
      { required: '- 2 sage', owned: 'owned 1' },
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
});

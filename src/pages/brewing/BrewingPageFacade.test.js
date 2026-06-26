// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { BrewingPageFacade } from './BrewingPageFacade.js';

describe('BrewingPageFacade', () => {
  it('does not rewrite cauldron 1 auto brew when selecting a recipe in cauldron 2', () => {
    const snapshot = {
      brewing: {
        cauldrons: [
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
        ],
      },
    };
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      prepareBrewingRecipe: vi.fn(() => ({ ok: true })),
      setBrewingAutoBrewRecipe: vi.fn(() => ({ ok: true })),
    };
    const facade = new BrewingPageFacade({ gameplayFacade });
    facade.cauldronManager.render = vi.fn();

    facade.selectRecipe('minorHealingPotion', 1);

    expect(gameplayFacade.prepareBrewingRecipe).toHaveBeenCalledWith(
      'minorHealingPotion',
      1,
    );
    expect(gameplayFacade.setBrewingAutoBrewRecipe).not.toHaveBeenCalled();
    expect(snapshot.brewing.cauldrons[0]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
  });

  it('opens the recipe book from a selected cauldron and clears the recipe there', () => {
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
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            ingredients: [],
            maxIngredients: 5,
            manaCost: 12,
            activeBrew: null,
            match: null,
            canAddIngredient: true,
            canBrew: false,
          },
        ],
      },
    };
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listener(snapshot);
        return () => {};
      },
      prepareBrewingRecipe: vi.fn(() => ({ ok: true })),
    };
    const stage = document.createElement('div');
    document.body.append(stage);
    const facade = new BrewingPageFacade({ gameplayFacade });

    facade.mount(stage);
    facade.recipeGuideManager.selectRecipe('manaTonic', 0);

    stage
      .querySelector('.brewing-page__cauldron')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const recipePopup = stage.querySelector('.brewing-page__recipes-popup');
    expect(recipePopup?.hidden).toBe(false);
    expect(stage.querySelector('.brewing-page__recipe-choice-popup')?.hidden).toBe(true);

    stage
      .querySelector('.brewing-page__recipe-row.is-selected .brewing-page__recipe-select-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(recipePopup?.hidden).toBe(false);
    expect(facade.recipeGuideManager.getSelectedRecipeKey(0)).toBeNull();

    facade.unmount();
    stage.remove();
  });
});

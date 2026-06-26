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

  it('opens the recipe dialog from the cauldron recipes button and clears there', () => {
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

    const recipesButton = stage.querySelector('.brewing-page__cauldron-select-recipe-text');
    expect(recipesButton?.textContent).toBe('recipes');

    recipesButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

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

  it('opens player info from a recipe discoverer link', () => {
    const snapshot = {
      brewing: {
        herbs: [],
        ingredients: [],
        recipes: [
          {
            key: 'ashenMemory',
            label: 'ashen memory',
            unlocked: true,
            discovered: true,
            discoveredByUsername: 'Ada',
            discoveredByIdentity: 'identity-a',
            discoveryType: 'unknown',
            unknown: true,
            manaCost: 36,
            brewDurationMs: 80_000,
            ingredients: [],
          },
        ],
        maxIngredients: 5,
        manaCost: 0,
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
            manaCost: 0,
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
    };
    const onOpenPlayerInfo = vi.fn();
    const stage = document.createElement('div');
    document.body.append(stage);
    const facade = new BrewingPageFacade({ gameplayFacade, onOpenPlayerInfo });

    facade.mount(stage);
    facade.recipeBookManager.show();

    const byline = stage.querySelector('.brewing-page__recipe-discovery-row');
    expect(byline?.textContent).toBe('- discovered by Ada');

    stage
      .querySelector('.brewing-page__recipe-discovery-name')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onOpenPlayerInfo).toHaveBeenCalledWith({
      identity: 'identity-a',
      username: 'Ada',
    });

    facade.unmount();
    stage.remove();
  });

  it('uses the selected recipe before enabling auto brew', () => {
    const snapshot = {
      brewing: {
        cauldrons: [
          {
            cauldronIndex: 0,
            cauldronNumber: 1,
            autoBrewEnabled: false,
            autoBrewRecipeKey: null,
          },
        ],
      },
    };
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      setBrewingAutoBrewRecipe: vi.fn((recipeKey, cauldronIndex) => {
        snapshot.brewing.cauldrons[cauldronIndex].autoBrewRecipeKey = recipeKey;
        return { ok: true, autoBrewRecipeKey: recipeKey, cauldronIndex };
      }),
      setBrewingAutoBrewEnabled: vi.fn((enabled, cauldronIndex) => {
        snapshot.brewing.cauldrons[cauldronIndex].autoBrewEnabled = enabled === true;
        return {
          ok: true,
          autoBrewEnabled: enabled === true,
          cauldronIndex,
        };
      }),
    };
    const facade = new BrewingPageFacade({ gameplayFacade });
    facade.cauldronManager.render = vi.fn();

    facade.recipeGuideManager.selectRecipe('manaTonic', 0);

    expect(facade.toggleAutoBrew(0)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
      cauldronIndex: 0,
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe).toHaveBeenCalledWith(
      'manaTonic',
      0,
    );
    expect(gameplayFacade.setBrewingAutoBrewEnabled).toHaveBeenCalledWith(true, 0);
    expect(snapshot.brewing.cauldrons[0]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
  });
});

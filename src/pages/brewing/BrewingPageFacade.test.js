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
});

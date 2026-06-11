// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { BrewingAutoBrewManager } from './BrewingAutoBrewManager.js';

function createSnapshot() {
  return {
    brewing: {
      autoBrewEnabled: false,
      autoBrewRecipeKey: null,
      recipes: [
        {
          key: 'manaTonic',
          label: 'Mana Tonic',
          unlocked: true,
          manaCost: 12,
          brewDurationMs: 30_000,
          ingredients: [
            {
              key: 'sageHerb',
              label: 'Sage',
              quantity: 3,
            },
          ],
        },
      ],
    },
  };
}

function createGameplayFacadeFake(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
    setBrewingAutoBrewRecipe: (recipeKey) => {
      snapshot.brewing.autoBrewRecipeKey = recipeKey;
      return { ok: true };
    },
    setBrewingAutoBrewEnabled: (enabled) => {
      snapshot.brewing.autoBrewEnabled = enabled === true;
      return { ok: true };
    },
  };
}

describe('BrewingAutoBrewManager', () => {
  it('selects a recipe before enabling auto brewing', () => {
    const snapshot = createSnapshot();
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingAutoBrewManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.style-box__title').textContent).toBe('auto brewing');
    expect(parent.querySelector('.brewing-page__auto-row .row_val').textContent).toBe(
      'disabled',
    );
    expect(parent.querySelector('.brewing-page__auto-state-button').disabled).toBe(true);
    expect(parent.querySelector('.brewing-page__auto-toggle-row')).toBeNull();

    parent.querySelector('.brewing-page__auto-recipe-button').click();

    expect(snapshot.brewing.autoBrewRecipeKey).toBe('manaTonic');
    expect(parent.querySelector('.brewing-page__auto-row:nth-child(2) .row_val').textContent).toBe(
      'Mana Tonic',
    );
    expect(parent.querySelector('.brewing-page__auto-recipe-button').textContent).toBe(
      'selected',
    );
    expect(parent.querySelector('.brewing-page__auto-state-button').disabled).toBe(false);

    parent.querySelector('.brewing-page__auto-state-button').click();

    expect(snapshot.brewing.autoBrewEnabled).toBe(true);
    expect(parent.querySelector('.brewing-page__auto-row .row_val').textContent).toBe(
      'enabled',
    );
    expect(parent.querySelector('.brewing-page__auto-state-button').getAttribute('aria-pressed')).toBe(
      'true',
    );

    parent.querySelector('.brewing-page__auto-state-button').click();

    expect(snapshot.brewing.autoBrewEnabled).toBe(false);
    expect(parent.querySelector('.brewing-page__auto-row .row_val').textContent).toBe(
      'disabled',
    );

    manager.unmount();
    parent.remove();
  });
});

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

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
      recipes: [
        {
          key: 'minorHealingPotion',
          label: 'Minor Healing Potion',
          unlocked: true,
          manaCost: 10,
          brewDurationMs: 10_000,
          ingredients: [
            {
              key: 'sageHerb',
              label: 'Sage',
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

    const button = parent.querySelector('.brewing-page__recipe-select-button');

    expect(button.textContent).toBe('selected');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Minor Healing Potion selected recipe');

    manager.unmount();
    parent.remove();
  });
});

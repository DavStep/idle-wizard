// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { BrewingRecipeGuideManager } from './BrewingRecipeGuideManager.js';

function createGameplayFacadeFake(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

function createSnapshot(ingredients = []) {
  return {
    brewing: {
      ingredients,
      recipes: [
        {
          key: 'minorHealingPotion',
          label: 'Minor Healing Potion',
          ingredients: [
            {
              itemTypeId: 1001,
              key: 'sageHerb',
              label: 'Sage',
              kind: 'herb',
              quantity: 2,
            },
            {
              itemTypeId: 1002,
              key: 'mintHerb',
              label: 'Mint',
              kind: 'herb',
              quantity: 1,
            },
          ],
        },
      ],
    },
  };
}

function mountGuide(snapshot) {
  const parent = document.createElement('div');
  document.body.append(parent);

  const manager = new BrewingRecipeGuideManager({
    gameplayFacade: createGameplayFacadeFake(snapshot),
  });

  manager.mount(parent);
  manager.selectRecipe('minorHealingPotion');

  return { manager, parent };
}

describe('BrewingRecipeGuideManager', () => {
  it('renders grouped recipe ingredient quantities', () => {
    const { manager, parent } = mountGuide(createSnapshot());

    const labels = [...parent.querySelectorAll('.brewing-page__guide-step .row_key')].map(
      (row) => row.textContent,
    );
    const guide = parent.querySelector('.brewing-page__guide');

    expect(labels).toEqual(['- 2 Sage', '- 1 Mint']);
    expect(labels).not.toContain('1. Sage');
    expect(labels).not.toContain('2. Sage');
    expect(guide.style.getPropertyValue('--brewing-page-guide-sequence-height')).toBe(
      'calc(var(--style-row-min-height) * 2)',
    );

    manager.unmount();
    parent.remove();
  });

  it('keeps group progress status while matching expanded ingredient order', () => {
    const { manager, parent } = mountGuide(
      createSnapshot([
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
        },
        {
          itemTypeId: 1001,
          key: 'sageHerb',
          label: 'Sage',
          kind: 'herb',
        },
      ]),
    );

    const steps = [...parent.querySelectorAll('.brewing-page__guide-step')];

    expect(steps[0].querySelector('.row_key').textContent).toBe('- 2 Sage');
    expect(steps[0].querySelector('.row_val').textContent).toBe('placed');
    expect(steps[1].querySelector('.row_key').textContent).toBe('- 1 Mint');
    expect(steps[1].querySelector('.row_val').textContent).toBe('next');

    manager.unmount();
    parent.remove();
  });

  it('keeps the marked recipe across page unmount and remount', () => {
    const snapshot = createSnapshot();
    const parent = document.createElement('div');
    document.body.append(parent);
    const manager = new BrewingRecipeGuideManager({
      gameplayFacade: createGameplayFacadeFake(snapshot),
    });

    manager.mount(parent);
    manager.selectRecipe('minorHealingPotion');
    manager.unmount();

    const nextParent = document.createElement('div');
    document.body.append(nextParent);
    manager.mount(nextParent);

    expect(manager.getSelectedRecipeKey()).toBe('minorHealingPotion');
    expect(nextParent.querySelector('.brewing-page__guide-row .row_val').textContent).toBe(
      'Minor Healing Potion',
    );

    manager.unmount();
    parent.remove();
    nextParent.remove();
  });

  it('unmarks the selected recipe when it is selected again', () => {
    const { manager, parent } = mountGuide(createSnapshot());

    manager.selectRecipe('minorHealingPotion');

    expect(manager.getSelectedRecipeKey()).toBe(null);
    expect(parent.querySelector('.brewing-page__guide-row .row_val').textContent).toBe('none');
    expect(
      parent
        .querySelector('.brewing-page__guide')
        .style.getPropertyValue('--brewing-page-guide-sequence-height'),
    ).toBe('var(--style-row-min-height)');

    manager.unmount();
    parent.remove();
  });
});

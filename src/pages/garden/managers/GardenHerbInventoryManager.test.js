// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { GardenSeedInventoryManager } from './GardenHerbInventoryManager.js';

function createGameplayFacadeFake() {
  const snapshot = {
    garden: {
      seeds: [
        {
          itemTypeId: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
          quantity: 2,
        },
      ],
    },
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

describe('GardenSeedInventoryManager', () => {
  it('renders owned seed rows without drag/drop affordances', () => {
    const parent = document.createElement('section');
    const manager = new GardenSeedInventoryManager({
      gameplayFacade: createGameplayFacadeFake(),
    });

    manager.mount(parent);

    const row = parent.querySelector('.garden-page__seed-inventory-row');

    expect(row?.draggable).toBe(false);
    expect(row?.classList.contains('is-draggable')).toBe(false);
    expect(row?.getAttribute('aria-label')).toBe('mint seed, owned 2');
  });
});

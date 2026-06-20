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
  it('makes owned seed rows draggable through the plot drag controller', () => {
    const parent = document.createElement('section');
    const calls = [];
    const seedDragController = {
      canUseNativeSeedDrag: () => true,
      onSeedNativeDragStart: (event, item) => calls.push(['native-start', item.itemTypeId]),
      onSeedNativeDragEnd: () => calls.push(['native-end']),
      onSeedPointerDown: (event, item) => calls.push(['pointer-down', item.itemTypeId]),
    };
    const manager = new GardenSeedInventoryManager({
      gameplayFacade: createGameplayFacadeFake(),
      seedDragController,
    });

    manager.mount(parent);

    const row = parent.querySelector('.garden-page__seed-inventory-row');
    const dragStart = new window.Event('dragstart', {
      bubbles: true,
      cancelable: true,
    });

    expect(row?.draggable).toBe(true);
    expect(row?.classList.contains('is-draggable')).toBe(true);
    expect(row?.getAttribute('aria-label')).toBe('drag mint seed to a plot, owned 2');

    row.dispatchEvent(dragStart);
    row.dispatchEvent(
      new window.MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      }),
    );
    row.dispatchEvent(new window.Event('dragend', { bubbles: true }));

    expect(calls).toEqual([
      ['native-start', 2],
      ['pointer-down', 2],
      ['native-end'],
    ]);
  });
});

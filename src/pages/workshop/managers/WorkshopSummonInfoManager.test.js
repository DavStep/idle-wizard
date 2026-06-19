// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { WorkshopSummonInfoManager } from './WorkshopSummonInfoManager.js';

function createGameplayFacadeFake(snapshot) {
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    publish: () => {
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}

describe('WorkshopSummonInfoManager', () => {
  it('shows unlocked seed drop chances', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            dropChance: 0.25,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            dropChance: 0.75,
          },
        ],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    const popup = parent.querySelector('.workshop-page__summon-info-popup');
    const rows = [...parent.querySelectorAll('.workshop-page__summon-info-row')];

    expect(popup?.hidden).toBe(false);
    expect(rows.map((row) => row.textContent)).toEqual(['sage seed25%', 'mint seed75%']);

    parent
      .querySelector('.workshop-page__summon-info-close')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup?.hidden).toBe(true);

    manager.unmount();
  });

  it('shows an empty state when no seeds are unlocked', () => {
    const gameplayFacade = createGameplayFacadeFake({
      seedSummoning: {
        dropChances: [],
      },
    });
    const manager = new WorkshopSummonInfoManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);
    manager.show();

    expect(parent.querySelector('.workshop-page__summon-info-empty')?.textContent).toBe(
      'no seeds researched',
    );

    manager.unmount();
  });
});

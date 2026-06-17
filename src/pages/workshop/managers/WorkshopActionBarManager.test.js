// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { WorkshopActionBarManager } from './WorkshopActionBarManager.js';

function createGameplayFacadeFake(overrides = {}) {
  const listeners = new Set();
  const snapshot = {
    mana: {
      current: 10,
      cap: 150,
      perSecond: 3,
    },
    seedSummoning: {
      cost: 10,
      quantity: 1,
      canSummon: true,
    },
    tasks: {
      currentLevel: 3,
    },
    ...overrides,
  };

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
    summonSeed: () => ({ ok: true, seed: { label: 'sage seed' }, quantity: 1 }),
  };
}

describe('WorkshopActionBarManager', () => {
  it('keeps the summon seed dot immediate in early levels', () => {
    const gameplayFacade = createGameplayFacadeFake({
      mana: { current: 10, cap: 100, perSecond: 2 },
      tasks: { currentLevel: 2 },
    });
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-button');

    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('red');

    manager.unmount();
  });

  it('shows the summon seed dot after early levels only when mana is capped', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const manager = new WorkshopActionBarManager({ gameplayFacade });
    const parent = document.createElement('div');

    manager.mount(parent);

    const button = parent.querySelector('.workshop-page__summon-button');

    expect(button?.dataset.notification).toBeUndefined();

    gameplayFacade.getSnapshot().mana.current = 150;
    gameplayFacade.publish();

    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('orange');

    manager.unmount();
  });
});

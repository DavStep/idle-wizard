// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { ResearchBoxListManager } from './ResearchBoxListManager.js';

function createTouchEvent(type, target) {
  const touch = {
    identifier: 1,
    clientX: 120,
    clientY: 180,
    target,
  };
  const event = new window.Event(type, {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [touch],
  });
  Object.defineProperty(event, 'targetTouches', {
    value: type === 'touchend' ? [] : [touch],
  });
  Object.defineProperty(event, 'changedTouches', {
    value: [touch],
  });
  return event;
}

function createGameplayFacade(snapshot) {
  return {
    subscribe(callback) {
      callback(snapshot);
      return () => {};
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

describe('ResearchBoxListManager', () => {
  it('opens locked research info on row tap and explains missing requirements', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'recipeUnlocks',
            label: 'recipe unlocks research',
            researches: [
              {
                id: 'unlockRecipe:manaTonic',
                label: 'mana tonic',
                value: '150 gold',
                effect: 'brew',
                description: 'allows valid cauldron ingredients to brew mana tonic.',
                costGold: 150,
                completed: false,
                canResearch: true,
                requiredPlayerLevel: 4,
              },
              {
                id: 'unlockRecipe:minorHealingPotion',
                label: 'minor healing potion',
                value: 'locked',
                effect: 'brew',
                description:
                  'allows valid cauldron ingredients to brew minor healing potion.',
                costGold: 350,
                completed: false,
                locked: true,
                canResearch: false,
                requiredResearchIds: ['unlockRecipe:manaTonic'],
                requiredPlayerLevel: 5,
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
      onShowResearchInfo,
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const row = [...stage.querySelectorAll('.research-page__row')].find((candidate) =>
      candidate.textContent?.includes('minor healing potion'),
    );

    expect(row?.classList.contains('is-locked')).toBe(true);

    row.dispatchEvent(createTouchEvent('touchstart', row));
    row.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowResearchInfo).toHaveBeenCalledTimes(1);
    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'unlockRecipe:minorHealingPotion',
        lockReason: 'requires mana tonic research and level 5.',
      }),
    );
  });
});

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
  it('colors completed seed unlock research names as seed resources', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'seedUnlocks',
            label: 'seed unlock researches',
            researches: [
              {
                id: 'unlockSeed:sageSeed',
                label: 'sage seed',
                value: 'researched',
                completed: true,
              },
              {
                id: 'unlockSeed:mintSeed',
                label: 'mint seed',
                value: 'researched',
                completed: true,
              },
              {
                id: 'unlockSeed:nettleSeed',
                label: 'nettle seed',
                value: 'locked',
                completed: false,
                canResearch: false,
                locked: true,
              },
            ],
          },
        ],
        completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const rows = [...stage.querySelectorAll('.research-page__row')];
    const researchedNames = rows
      .filter((row) => row.textContent?.includes('researched'))
      .map((row) => row.querySelector('.research-page__research-name'));
    const lockedRow = rows.find((row) => row.textContent?.includes('nettle seed'));

    expect(researchedNames).toHaveLength(2);
    expect(researchedNames.map((name) => name?.dataset.resourceColor)).toEqual([
      'seed',
      'seed',
    ]);
    expect(lockedRow?.classList.contains('is-unavailable')).toBe(true);
  });

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
                value: 'free',
                effect: 'brew',
                description: 'allows valid cauldron ingredients to brew mana tonic.',
                costGold: 0,
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

  it('explains prestige-locked research requirements', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 17,
      },
      prestige: {
        completedLevels: [10],
      },
      research: {
        boxes: [
          {
            id: 'cauldronCapacity',
            label: 'cauldron capacity research',
            researches: [
              {
                id: 'advanced:cauldronCapacity:6',
                label: 'cauldron 6 capacity',
                value: 'locked',
                effect: '+1 cauldron',
                description: 'raises cauldron capacity to 6.',
                costRuby: 1,
                costCurrency: 'ruby',
                completed: false,
                locked: true,
                canResearch: false,
                requiredPrestigeCount: 2,
                requiredResearchIds: [],
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

    const row = stage.querySelector('.research-page__row');
    row.dispatchEvent(createTouchEvent('touchstart', row));

    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'advanced:cauldronCapacity:6',
        lockReason: 'requires 2 prestiges.',
      }),
    );
  });
});

// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

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

  it('colors completed advanced and emerald research names and values by resource', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 9,
      },
      research: {
        tabs: [
          {
            id: 'advanced',
            label: 'advanced research',
            boxes: [
              {
                id: 'advancedAutomation',
                label: 'advanced research',
                researches: [
                  {
                    id: 'advanced:plotGrowth:1:1',
                    label: 'auto plant tile 1',
                    value: 'researched',
                    completed: true,
                  },
                  {
                    id: 'advanced:plotGrowth:2:1',
                    label: 'auto plant tile 2',
                    value: '1 ruby',
                    completed: false,
                    canResearch: true,
                  },
                ],
              },
            ],
          },
          {
            id: 'emerald',
            label: 'emerald research',
            boxes: [
              {
                id: 'plotPlanting',
                label: 'plot planting research',
                researches: [
                  {
                    id: 'emerald:plotPlanting:1:2',
                    label: 'plot 1 planting x2',
                    value: 'researched',
                    completed: true,
                  },
                  {
                    id: 'emerald:plotPlanting:1:3',
                    label: 'plot 1 planting x3',
                    value: '2 emerald',
                    completed: false,
                    canResearch: true,
                  },
                ],
              },
            ],
          },
        ],
        completedResearchIds: [
          'advanced:plotGrowth:1:1',
          'emerald:plotPlanting:1:2',
        ],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const completedRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 1'),
    );
    const availableRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('auto plant tile 2'),
    );

    expect(
      completedRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBe('crystal');
    expect(
      completedRow?.querySelector('.research-page__research-value')?.dataset.resourceColor,
    ).toBe('crystal');
    expect(
      availableRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      availableRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('ruby');

    manager.onSelectTab('emerald');

    const completedEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('plot 1 planting x2'),
    );
    const availableEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('plot 1 planting x3'),
    );

    expect(
      completedEmeraldRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      completedEmeraldRow?.querySelector('.research-page__research-value')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      availableEmeraldRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('emerald');
  });

  it('lets completed advanced research values use crystal color styling', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toContain(
      '.research-page__research-value[data-resource-color="crystal"]',
    );
    expect(css).toContain(
      '.research-page__research-value[data-resource-color="emerald"]',
    );
    expect(css).toContain('color: var(--style-resource-crystal);');
    expect(css).toContain('color: var(--style-resource-emerald);');
  });

  it('keeps research tab labels in one four-column row', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(css).toContain('line-height: var(--style-tiny-line-height);');
    expect(css).toContain('white-space: normal;');
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

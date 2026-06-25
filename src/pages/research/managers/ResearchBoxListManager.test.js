// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ResearchBoxListManager } from './ResearchBoxListManager.js';
import { TIMER_PROGRESS_STEP_MS } from '../../shared/timerDisplay.js';

function createTouchEvent(type, target, { clientX = 120, clientY = 180 } = {}) {
  const touch = {
    identifier: 1,
    clientX,
    clientY,
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
                    costRuby: 1,
                    costCurrency: 'ruby',
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
                id: 'cauldronBrewing',
                label: 'cauldron level up',
                researches: [
                  {
                    id: 'emerald:cauldronBrewing:1:2',
                    label: 'cauldron 1',
                    value: '★',
                    effect: 'x2 potions',
                    showEffect: true,
                    actionType: 'levelUp',
                    level: 2,
                    starLevel: 1,
                    completed: true,
                  },
                  {
                    id: 'emerald:cauldronBrewing:1:3',
                    label: 'cauldron 1',
                    value: '2 emerald',
                    effect: 'x3 potions',
                    showEffect: true,
                    actionType: 'levelUp',
                    level: 3,
                    starLevel: 2,
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
          'emerald:cauldronBrewing:1:2',
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
    ).toBe('ruby');
    expect(
      completedRow?.querySelector('.research-page__research-value')?.dataset.resourceColor,
    ).toBe('ruby');
    expect(
      availableRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      availableRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('ruby');

    manager.onSelectTab('emerald');

    const completedEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('x2 potions'),
    );
    const availableEmeraldRow = [...stage.querySelectorAll('.research-page__row')].find((row) =>
      row.textContent?.includes('x3 potions'),
    );
    const completedEmeraldName = completedEmeraldRow?.querySelector(
      '.research-page__research-name',
    );
    const completedEmeraldValue = completedEmeraldRow?.querySelector(
      '.research-page__research-value',
    );
    const availableEmeraldName = availableEmeraldRow?.querySelector(
      '.research-page__research-name',
    );

    expect(completedEmeraldName?.textContent).toBe('cauldron 1 ★');
    expect(
      completedEmeraldName?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldName?.dataset.resourceColor).toBe('emerald');
    expect(completedEmeraldValue?.textContent).toBe('★');
    expect(
      completedEmeraldValue?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldValue?.dataset.resourceColor).toBe('emerald');
    expect(availableEmeraldName?.textContent).toBe('cauldron 1 ★★');
    expect(stage.textContent).not.toContain('cauldron 1 lvl');
    expect(
      availableEmeraldRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      availableEmeraldRow
        ?.querySelector('.research-page__research-button')
        ?.getAttribute('aria-label'),
    ).toBe('level up cauldron 1 ★★ x3 potions for 2 emerald');
  });

  it('lets completed research values use resource color styling', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toContain(
      '.research-page__research-value[data-resource-color="crystal"]',
    );
    expect(css).toContain(
      '.research-page__research-value[data-resource-color="ruby"]',
    );
    expect(css).toContain(
      '.research-page__research-value[data-resource-color="emerald"]',
    );
    expect(css).toContain('color: var(--style-resource-crystal);');
    expect(css).toContain('color: var(--style-resource-ruby);');
    expect(css).toContain('color: var(--style-resource-emerald);');
  });

  it('keeps research tab labels in one four-column row', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(css).toContain('line-height: var(--style-tiny-line-height);');
    expect(css).toContain('white-space: normal;');
  });

  it('renders active research timers and bars with stepped progress', () => {
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
                value: 'researching',
                completed: false,
                inProgress: true,
                canResearch: false,
                totalMs: 120_000,
                remainingMs: 75_000,
                progress: 0.375,
              },
            ],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const value = stage.querySelector('.research-page__research-value');
    const fill = stage.querySelector('.research-page__research-progress-fill');

    expect(value?.textContent).toBe('researching 1m 15s');
    expect(fill?.classList.contains('is-progress-running')).toBe(false);
    expect(fill?.style.transition).toBe(
      `transform ${TIMER_PROGRESS_STEP_MS}ms linear`,
    );
    expect(fill?.style.transform).toBe('scaleX(0.375)');
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
                costCoin: 0,
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
                costCoin: 350,
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
    document.body.append(stage);

    manager.mount(stage);

    const row = [...stage.querySelectorAll('.research-page__row')].find((candidate) =>
      candidate.textContent?.includes('minor healing potion'),
    );

    expect(row?.classList.contains('is-locked')).toBe(true);

    row.dispatchEvent(createTouchEvent('touchstart', row));
    row.dispatchEvent(createTouchEvent('touchend', row));
    row.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowResearchInfo).toHaveBeenCalledTimes(1);
    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'unlockRecipe:minorHealingPotion',
        lockReason: 'requires mana tonic research and level 5.',
      }),
    );

    manager.unmount();
    stage.remove();
  });

  it('does not explain locked research when the row touch scrolls', () => {
    const onShowResearchInfo = vi.fn();
    const snapshot = {
      playerLevel: {
        currentLevel: 4,
      },
      research: {
        boxes: [
          {
            id: 'recipeUnlocks',
            label: 'recipe unlock researches',
            researches: [
              {
                id: 'unlockRecipe:minorHealingPotion',
                label: 'minor healing potion',
                value: 'locked',
                effect: 'brew',
                description:
                  'allows valid cauldron ingredients to brew minor healing potion.',
                costCoin: 350,
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
    document.body.append(stage);

    manager.mount(stage);

    const row = stage.querySelector('.research-page__row');
    row.dispatchEvent(createTouchEvent('touchstart', row, { clientX: 10, clientY: 10 }));
    document.dispatchEvent(createTouchEvent('touchmove', row, { clientX: 10, clientY: 32 }));
    row.dispatchEvent(createTouchEvent('touchend', row, { clientX: 10, clientY: 32 }));

    expect(onShowResearchInfo).not.toHaveBeenCalled();

    manager.unmount();
    stage.remove();
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
    document.body.append(stage);

    manager.mount(stage);

    const row = stage.querySelector('.research-page__row');
    row.dispatchEvent(createTouchEvent('touchstart', row));
    row.dispatchEvent(createTouchEvent('touchend', row));

    expect(onShowResearchInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'advanced:cauldronCapacity:6',
        lockReason: 'requires 2 prestiges.',
      }),
    );

    manager.unmount();
    stage.remove();
  });
});

// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ResearchBoxListManager } from './ResearchBoxListManager.js';

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

function createGameplayFacade(snapshot, overrides = {}) {
  return {
    subscribe(callback) {
      callback(snapshot);
      return () => {};
    },
    getSnapshot() {
      return snapshot;
    },
    setPrestigeRunFocus: () => ({ ok: true }),
    ...overrides,
  };
}

describe('ResearchBoxListManager', () => {
  it('colors completed seed unlock research names as seed resources', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 5,
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

  it('renders research boxes in the standard scroll list', () => {
    const snapshot = {
      playerLevel: {
        currentLevel: 5,
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
                value: 'free',
                completed: false,
                canResearch: true,
                requiredResearchIds: ['unlockSeed:sageSeed'],
              },
              {
                id: 'unlockSeed:nettleSeed',
                label: 'nettle seed',
                value: 'locked',
                completed: false,
                canResearch: false,
                locked: true,
                requiredResearchIds: ['unlockSeed:mintSeed'],
              },
            ],
          },
        ],
        completedResearchIds: ['unlockSeed:sageSeed'],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });
    const stage = document.createElement('section');

    manager.mount(stage);

    const content = stage.querySelector('.research-page__content');
    const list = stage.querySelector('.research-page__box-list');
    const box = stage.querySelector('.research-page__box');
    const rows = [...stage.querySelectorAll('.research-page__row')];

    expect(content).not.toBeNull();
    expect(list?.classList.contains('style-page-scroll')).toBe(true);
    expect(list?.dataset.scrollCueProgress).toBe('inline');
    expect(stage.querySelector('.research-page__world-view')).toBeNull();
    expect(stage.querySelector('.research-page__world-shell')).toBeNull();
    expect(stage.querySelector('.research-page__zoom-controls')).toBeNull();
    expect(stage.querySelector('.research-page__tree-connectors')).toBeNull();
    expect(box?.getAttribute('aria-label')).toBe('seed unlock researches');
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.className)).toEqual([
      'research-page__row is-completed',
      'research-page__row is-available',
      'research-page__row is-unavailable is-locked',
    ]);
  });

  it('colors completed advanced and crystal multiplier research names and values by resource', () => {
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
                    costEmerald: 1,
                    costCurrency: 'emerald',
                    completed: true,
                  },
                  {
                    id: 'advanced:plotGrowth:2:1',
                    label: 'auto plant tile 2',
                    value: '1 emerald',
                    costEmerald: 1,
                    costCurrency: 'emerald',
                    completed: false,
                    canResearch: true,
                  },
                ],
              },
            ],
          },
          {
            id: 'emerald',
            label: 'crystal research',
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
                    costCrystal: 1,
                    costCurrency: 'crystal',
                    completed: true,
                  },
                  {
                    id: 'emerald:cauldronBrewing:1:3',
                    label: 'cauldron 1',
                    value: '2 crystal',
                    effect: 'x3 potions',
                    showEffect: true,
                    actionType: 'levelUp',
                    level: 3,
                    starLevel: 2,
                    costCrystal: 2,
                    costCurrency: 'crystal',
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
    ).toBe('emerald');
    expect(
      completedRow?.querySelector('.research-page__research-value')?.dataset.resourceColor,
    ).toBe('emerald');
    expect(
      availableRow?.querySelector('.research-page__research-name')?.dataset.resourceColor,
    ).toBeUndefined();
    expect(
      availableRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('emerald');

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
    expect(completedEmeraldName?.dataset.resourceColor).toBe('crystal');
    expect(completedEmeraldValue?.textContent).toBe('★');
    expect(
      completedEmeraldValue?.querySelector('.style-star-level')?.dataset.starCount,
    ).toBe('1');
    expect(completedEmeraldValue?.dataset.resourceColor).toBe('crystal');
    expect(availableEmeraldName?.textContent).toBe('cauldron 1 ★★');
    expect(stage.textContent).not.toContain('cauldron 1 lvl');
    expect(
      availableEmeraldRow?.querySelector('.research-page__research-button')?.dataset.resourceColor,
    ).toBe('crystal');
    expect(
      availableEmeraldRow
        ?.querySelector('.research-page__research-button')
        ?.getAttribute('aria-label'),
    ).toBe('level up cauldron 1 ★★ x3 potions for 2 crystal');
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

  it('centers research prices inside their action buttons', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const buttonRule = css.match(
      /\.style-button\.research-page__research-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(buttonRule).toContain('text-align: center;');
  });

  it('uses the standard full-page scroll list structure', () => {
    const css = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const contentRule = css.match(
      /\.research-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const listRule = css.match(
      /\.research-page__box-list\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(contentRule).toContain('top: var(--style-room-content-top);');
    expect(contentRule).toContain('right: 16px;');
    expect(contentRule).toContain('bottom: var(--style-room-chat-clearance);');
    expect(contentRule).toContain('left: 16px;');
    expect(listRule).toContain('bottom: var(--style-page-tab-scroll-clearance);');
    expect(listRule).toContain('display: flex;');
    expect(listRule).toContain('flex-direction: column;');
    expect(listRule).toContain('gap: 24px;');
    expect(listRule).toContain('padding-top: var(--style-page-scroll-padding-top);');
    expect(listRule).toContain(
      'padding-bottom: var(--style-page-scroll-padding-bottom);',
    );
    expect(listRule).toContain('overflow: hidden auto;');
    expect(css).not.toContain('.research-page__world-view');
    expect(css).not.toContain('.research-page__world-shell');
    expect(css).not.toContain('.research-page__tree-connectors');
    expect(css).not.toContain('.research-page__tree-node');
    expect(css).not.toContain('.research-page__zoom-controls');
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
    const frameCallbacks = [];

    document.body.append(stage);
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
    });

    manager.mount(stage);

    const value = stage.querySelector('.research-page__research-value');
    const fill = stage.querySelector('.research-page__research-progress-fill');

    expect(value?.textContent).toBe('researching 1m 15s');
    expect(fill?.style.transform).toBe('scaleX(0.375)');

    for (const callback of frameCallbacks) {
      callback();
    }

    expect(fill?.classList.contains('is-progress-running')).toBe(true);
    expect(fill?.style.transition).toBe('transform 75000ms linear');
    expect(fill?.style.transform).toBe('scaleX(1)');
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
                requiredPlayerLevel: 5,
              },
              {
                id: 'unlockRecipe:minorHealingPotion',
                label: 'minor healing potion',
                value: 'locked',
                effect: 'brew',
                description:
                  'allows valid cauldron ingredients to brew minor healing potion.',
                costCoin: 60,
                completed: false,
                locked: true,
                canResearch: false,
                requiredResearchIds: ['unlockRecipe:manaTonic'],
                requiredPlayerLevel: 6,
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
        lockReason: 'requires mana tonic research and level 6.',
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
                costCoin: 60,
                completed: false,
                locked: true,
                canResearch: false,
                requiredResearchIds: ['unlockRecipe:manaTonic'],
                requiredPlayerLevel: 6,
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
        completedLevels: [],
      },
      research: {
        boxes: [
          {
            id: 'cauldronCapacity',
            label: 'cauldron capacity research',
            researches: [
              {
                id: 'advanced:cauldronCapacity:3',
                label: 'cauldron 3 capacity',
                value: 'locked',
                effect: '+1 cauldron',
                description: 'raises cauldron capacity to 3.',
                costRuby: 1,
                costCurrency: 'ruby',
                completed: false,
                locked: true,
                canResearch: false,
                requiredPrestigeCount: 1,
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
        id: 'advanced:cauldronCapacity:3',
        lockReason: 'requires 1 prestige.',
      }),
    );

    manager.unmount();
    stage.remove();
  });

  it('does not render a timed research slot limit', () => {
    const snapshot = {
      playerLevel: { currentLevel: 17 },
      prestige: { completedLevels: [] },
      research: {
        slots: { active: 2, max: 2, full: true },
        boxes: [
          {
            id: 'researchTime',
            label: 'research time research',
            researches: [
              {
                id: 'advanced:researchTime:1',
                label: 'research time lvl 1',
                value: '1 ruby',
                effect: '-10% time',
                completed: false,
                canResearch: true,
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
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    expect(stage.querySelector('.research-page__slot-status')).toBeNull();
    expect(stage.querySelector('.research-page__research-button')?.disabled).toBe(false);

    manager.unmount();
    stage.remove();
  });

  it('pins run-focus matching research boxes first', () => {
    const setPrestigeRunFocus = vi.fn(() => ({ ok: true }));
    const snapshot = {
      playerLevel: {
        currentLevel: 17,
      },
      prestige: {
        completedLevels: [10, 20, 30],
        runFocus: {
          unlocked: true,
          selected: 'capacity',
          options: [
            { id: 'none', label: 'none' },
            { id: 'capacity', label: 'capacity' },
            { id: 'automation', label: 'automation' },
          ],
        },
      },
      research: {
        boxes: [
          {
            id: 'researchTime',
            label: 'research time research',
            researches: [],
          },
          {
            id: 'plotCapacity',
            label: 'plot capacity research',
            researches: [],
          },
        ],
        completedResearchIds: [],
      },
    };
    const manager = new ResearchBoxListManager({
      gameplayFacade: createGameplayFacade(snapshot, { setPrestigeRunFocus }),
    });
    const stage = document.createElement('section');
    document.body.append(stage);

    manager.mount(stage);

    const boxes = [...stage.querySelectorAll('.research-page__box')];
    expect(stage.querySelector('.research-page__run-focus')?.textContent).toContain(
      'capacity boxes first',
    );
    expect(boxes[0]?.getAttribute('aria-label')).toBe('plot capacity research');

    stage
      .querySelector('.research-page__run-focus-button[aria-pressed="false"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(setPrestigeRunFocus).toHaveBeenCalledWith('none');

    manager.unmount();
    stage.remove();
  });
});

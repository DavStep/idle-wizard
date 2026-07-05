// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { setNotificationVisibilityPolicy } from '../shared/notificationBadge.js';
import { TutorialFacade } from './TutorialFacade.js';
import { TUTORIAL_STORAGE_KEY } from './managers/TutorialProgressManager.js';
import { TUTORIAL_HINT_REMINDER_MS } from './managers/TutorialReminderManager.js';
import {
  TUTORIAL_LESSON_THREE_STUCK_MS,
  TUTORIAL_STEP_IDS,
} from './managers/TutorialStepManager.js';

const UI_SCALE = 3;
const LESSON_HORIZONTAL_CHROME = 24;
const LESSON_VERTICAL_CHROME = 21;

function createMemoryStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}

function setClientRect(element, rect) {
  element.getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    ...rect,
  });
}

function toClientRect(rect) {
  return {
    left: rect.left * UI_SCALE,
    top: rect.top * UI_SCALE,
    width: rect.width * UI_SCALE,
    height: rect.height * UI_SCALE,
  };
}

function getSourceAreaRect(element) {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left / UI_SCALE,
    top: rect.top / UI_SCALE,
    right: rect.right / UI_SCALE,
    bottom: rect.bottom / UI_SCALE,
  };
}

function getLessonRect(lesson) {
  const left = Number.parseFloat(lesson?.style.left ?? '');
  const top = Number.parseFloat(lesson?.style.top ?? '');
  const width = Number.parseFloat(lesson?.style.width ?? '') + LESSON_HORIZONTAL_CHROME;
  const height = Number.parseFloat(lesson?.style.height ?? '') + LESSON_VERTICAL_CHROME;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function createLevelThreeSnapshot() {
  return {
    coin: { current: 0 },
    inventory: [],
    seedInventory: [],
    seedSummoning: { canSummon: false },
    garden: {
      seeds: [],
      herbs: [],
      plot: { tiles: [] },
    },
    research: {
      completedResearchIds: [],
      inProgressResearches: [],
    },
    shop: {
      shelf: { slots: [] },
    },
    tasks: {
      currentLevel: 2,
      level: {
        completion: { canComplete: false, costCoin: 80 },
        tasks: [],
      },
    },
    brewing: {},
  };
}

function createLevelOneSnapshot() {
  return {
    ...createLevelThreeSnapshot(),
    tasks: {
      currentLevel: 0,
      level: {
        completion: { canComplete: false, costCoin: 10 },
        tasks: [],
      },
    },
  };
}

function createLevelOneObjectiveSnapshot() {
  return {
    ...createLevelOneSnapshot(),
    seedSummoning: { canSummon: true },
    tasks: {
      currentLevel: 0,
      level: {
        completion: { canComplete: false, costCoin: 10 },
        tasks: [
          {
            taskId: 'level1-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 1,
            progressQuantity: 1,
            canFill: true,
            canComplete: false,
            completed: false,
          },
        ],
      },
    },
  };
}

function createLevelOneReadyToTurnInSnapshot() {
  return {
    ...createLevelOneSnapshot(),
    seedInventory: [{ key: 'sageSeed', quantity: 5 }],
    seedSummoning: { canSummon: true },
    tasks: {
      currentLevel: 0,
      level: {
        completion: { canComplete: false, costCoin: 0 },
        tasks: [
          {
            taskId: 'level1-turn-in-sage-seed',
            itemKey: 'sageSeed',
            requiredQuantity: 5,
            progressQuantity: 0,
            remainingQuantity: 5,
            canFill: true,
            canComplete: false,
            completed: false,
          },
        ],
      },
    },
  };
}

function createLevelOneSaleSnapshot() {
  return {
    ...createLevelOneSnapshot(),
    seedInventory: [{ key: 'sageSeed', quantity: 5 }],
    tasks: {
      currentLevel: 1,
      level: {
        completion: { canComplete: true, costCoin: 4 },
        tasks: [
          {
            taskId: 'level2-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 5,
            progressQuantity: 5,
            remainingQuantity: 0,
            canFill: false,
            canComplete: false,
            completed: true,
          },
        ],
      },
    },
  };
}

function createLevelTwoSageTaskSnapshot(overrides = {}) {
  return {
    ...createLevelThreeSnapshot(),
    inventory: [],
    seedInventory: [{ key: 'sageSeed', quantity: 1 }],
    seedSummoning: { canSummon: false },
    garden: {
      seeds: [{ key: 'sageSeed', quantity: 1 }],
      herbs: [{ key: 'sageHerb', quantity: 0 }],
      plot: {
        tiles: [
          {
            tileNumber: 1,
            unlocked: true,
            phase: 'empty',
            selectedSeedKey: null,
            seedKey: null,
            seedLabel: null,
            herbLabel: null,
          },
        ],
      },
    },
    tasks: {
      currentLevel: 3,
      level: {
        completion: { canComplete: false, costCoin: 16 },
        tasks: [
          {
            taskId: 'level4-sage-herb',
            itemKey: 'sageHerb',
            requiredQuantity: 2,
            progressQuantity: 1,
            remainingQuantity: 1,
            canFill: false,
            canComplete: false,
            completed: false,
          },
        ],
      },
    },
    ...overrides,
  };
}

const LEVEL_ONE_COMPLETED_STEP_IDS = TUTORIAL_STEP_IDS.slice(
  0,
  TUTORIAL_STEP_IDS.indexOf('intro-market'),
);
const LEVEL_TWO_SELECTED_SALE_STEP_IDS = TUTORIAL_STEP_IDS.slice(
  0,
  TUTORIAL_STEP_IDS.indexOf('show-selected-sale-amount'),
);

describe('TutorialFacade', () => {
  afterEach(() => {
    vi.useRealTimers();
    setNotificationVisibilityPolicy(null);
    document.body.textContent = '';
  });

  it('primes the intro reveal gate before the first animation-frame refresh', () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const hadRequestAnimationFrame = 'requestAnimationFrame' in globalThis;
    const hadCancelAnimationFrame = 'cancelAnimationFrame' in globalThis;
    const frames = [];
    let facade = null;

    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback) => {
        frames.push(callback);
        return frames.length;
      }),
      writable: true,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });

    try {
      const stage = document.createElement('section');
      const gameplayFacade = {
        getSnapshot: () => createLevelOneSnapshot(),
        subscribe: () => () => {},
      };
      facade = new TutorialFacade({
        gameplayFacade,
        getCurrentPageId: () => 'workshop',
        storage: createMemoryStorage({
          [TUTORIAL_STORAGE_KEY]: JSON.stringify({
            completedStepIds: ['purchase-house'],
          }),
        }),
      });

      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      document.body.append(stage);

      facade.mount(stage);

      expect(stage.dataset.tutorialReveal).toBe('');
      expect(stage.hasAttribute('data-tutorial-reveal')).toBe(true);
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);

      frames.shift()?.(0);

      expect(facade.activeStep?.id).toBe('intro-welcome');
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    } finally {
      facade?.unmount();

      if (hadRequestAnimationFrame) {
        Object.defineProperty(globalThis, 'requestAnimationFrame', {
          configurable: true,
          value: originalRequestAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
      }

      if (hadCancelAnimationFrame) {
        Object.defineProperty(globalThis, 'cancelAnimationFrame', {
          configurable: true,
          value: originalCancelAnimationFrame,
          writable: true,
        });
      } else {
        Reflect.deleteProperty(globalThis, 'cancelAnimationFrame');
      }
    }
  });

  it('treats any press as next while an advance prompt is active', () => {
    let underlyingClicks = 0;
    const stage = document.createElement('section');
    const target = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage(),
    });

    target.addEventListener('click', () => {
      underlyingClicks += 1;
    });
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(target);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('purchase-house');
    expect(stage.dataset.tutorialReveal).toBe('');
    expect(stage.hasAttribute('data-tutorial-reveal')).toBe(true);

    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });

    target.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(underlyingClicks).toBe(0);
    expect(facade.progressManager.hasCompleted('purchase-house')).toBe(true);

    facade.unmount();
  });

  it('expands level 1 requirements when showing them from the lesson prompt', () => {
    let expanded = false;
    const stage = document.createElement('section');
    const tasksToggle = document.createElement('button');
    const taskButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneReadyToTurnInSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: [
            'purchase-house',
            'intro-welcome',
            'intro-mana-sphere',
            'first-summon-seed',
            'summon-five-seeds',
          ],
        }),
      }),
    });

    tasksToggle.dataset.tutorialId = 'workshop:tasks';
    tasksToggle.setAttribute('aria-expanded', 'false');
    tasksToggle.addEventListener('click', () => {
      expanded = true;
      tasksToggle.setAttribute('aria-expanded', 'true');
    });
    taskButton.dataset.tutorialId = 'task:level1-turn-in-sage-seed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(tasksToggle, { left: 64, top: 780, width: 240, height: 50 });
    setClientRect(taskButton, { left: 64, top: 720, width: 760, height: 70 });
    stage.append(tasksToggle, taskButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('intro-level-requirements');
    const backdrop = stage.querySelector('.tutorial-layer__backdrop');
    const maskRects = [...(backdrop?.querySelectorAll('mask rect') ?? [])];

    expect(backdrop?.hasAttribute('hidden')).toBe(false);
    expect(backdrop?.getAttribute('viewBox')).toBe('0 0 360 720');
    expect(maskRects).toHaveLength(1);

    stage
      .querySelector('.tutorial-layer__lesson-advance')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    facade.refresh();

    expect(expanded).toBe(true);
    expect(tasksToggle.getAttribute('aria-expanded')).toBe('true');
    expect(facade.activeStep?.id).toBe('first-fill-seed-task');
    expect(facade.activeStep?.targetId).toBe('task:level1-turn-in-sage-seed');

    facade.unmount();
  });

  it('lets Elara button toggle instead of advancing an active lesson', () => {
    const stage = document.createElement('section');
    const usernameButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['purchase-house'],
        }),
      }),
    });

    usernameButton.dataset.tutorialId = 'top:username';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(usernameButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const lessonButton = stage.querySelector('.tutorial-layer__lesson-button');

    lessonButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(facade.progressManager.hasCompleted('intro-welcome')).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);
    expect(lessonButton?.getAttribute('aria-label')).toBe('open lesson');

    facade.unmount();
  });

  it('spotlights the mana value and regen during the mana intro step', () => {
    const stage = document.createElement('section');
    const mana = document.createElement('span');
    const manaValue = document.createElement('span');
    const manaRegen = document.createElement('span');
    const snapshot = {
      ...createLevelOneSnapshot(),
      tasks: {
        ...createLevelOneSnapshot().tasks,
        currentLevel: 0,
      },
    };
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['purchase-house', 'intro-welcome'],
        }),
      }),
    });

    mana.dataset.tutorialId = 'top:mana';
    manaValue.dataset.tutorialId = 'top:mana:value';
    manaRegen.dataset.tutorialId = 'top:mana:regen';
    mana.append(manaValue, manaRegen);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      mana,
      toClientRect({
        left: 54,
        top: 18,
        width: 92,
        height: 40,
      }),
    );
    setClientRect(
      manaValue,
      toClientRect({
        left: 60,
        top: 20,
        width: 80,
        height: 18,
      }),
    );
    setClientRect(
      manaRegen,
      toClientRect({
        left: 60,
        top: 40,
        width: 36,
        height: 14,
      }),
    );
    stage.append(mana);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const backdrop = stage.querySelector('.tutorial-layer__backdrop');
    const maskRects = [...(backdrop?.querySelectorAll('mask rect') ?? [])];

    expect(facade.activeStep?.id).toBe('intro-mana-sphere');
    expect(backdrop?.hasAttribute('hidden')).toBe(false);
    expect(maskRects).toHaveLength(3);
    expect(
      maskRects.slice(1).map((rect) => [rect.getAttribute('x'), rect.getAttribute('y')]),
    ).toEqual([
      ['57', '17'],
      ['57', '37'],
    ]);

    facade.unmount();
  });

  it('keeps Elara collapsed instead of hiding while waiting for mana', () => {
    const stage = document.createElement('section');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: [
            'purchase-house',
            'intro-welcome',
            'intro-mana-sphere',
          ],
        }),
      }),
    });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('first-summon-seed');
    expect(facade.activeStep?.targetId).toBeNull();
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson-button')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);
    expect(
      stage
        .querySelector('.tutorial-layer__objective-button-label')
        ?.textContent,
    ).toBe('help');

    facade.unmount();
  });

  it('refreshes first summon guidance when frame mana reaches the cost', () => {
    const stage = document.createElement('section');
    const summonButton = document.createElement('button');
    let frameResourceListener = null;
    let snapshot = createLevelOneSnapshot();
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      subscribeFrameResources: vi.fn((listener) => {
        frameResourceListener = listener;
        return () => {
          frameResourceListener = null;
        };
      }),
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: [
            'purchase-house',
            'intro-welcome',
            'intro-mana-sphere',
          ],
        }),
      }),
    });
    const scheduleRefresh = vi.spyOn(facade, 'scheduleRefresh').mockImplementation(() => {
      facade.refresh();
    });

    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(summonButton, { left: 420, top: 1080, width: 240, height: 90 });
    stage.append(summonButton);
    document.body.append(stage);

    try {
      facade.mount(stage);

      expect(gameplayFacade.subscribeFrameResources).toHaveBeenCalled();
      expect(facade.activeStep?.id).toBe('first-summon-seed');
      expect(facade.activeStep?.targetId).toBeNull();

      snapshot = {
        ...createLevelOneSnapshot(),
        seedSummoning: { canSummon: true, cost: 10 },
      };
      frameResourceListener?.({ mana: { current: 10, cap: 50, perSecond: 1 } });

      expect(scheduleRefresh).toHaveBeenCalledTimes(2);
      expect(facade.activeStep?.id).toBe('first-summon-seed');
      expect(facade.activeStep?.targetId).toBe('workshop:summonSeed');
    } finally {
      facade.unmount();
      scheduleRefresh.mockRestore();
    }
  });

  it('publishes notification suppression only while the active step is blocking', () => {
    let snapshot = createLevelOneSnapshot();
    const policies = [];
    const stage = document.createElement('section');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage(),
      onNotificationVisibilityPolicyChange: (policy) => policies.push(policy),
    });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(policies.at(-1)).toEqual({
      active: true,
      allowedTutorialIds: [],
    });

    snapshot = createLevelThreeSnapshot();
    facade.progressManager.complete('intro-research');
    facade.refresh();

    expect(facade.activeStep?.id).toBe('research-mint-seed');
    expect(facade.activeStep?.cueMode).toBe('passive');
    expect(policies.at(-1)).toBeNull();

    facade.unmount();
  });

  it('hides the lesson when an app blocker appears after mount', async () => {
    const stage = document.createElement('section');
    const usernameButton = document.createElement('button');
    const blocker = document.createElement('section');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['purchase-house'],
        }),
      }),
    });

    usernameButton.dataset.tutorialId = 'top:username';
    blocker.className = 'app-fresh-start-choice';
    blocker.hidden = true;
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(usernameButton);
    document.body.append(stage, blocker);

    facade.mount(stage);
    facade.refresh();

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);

    blocker.hidden = false;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);

    blocker.hidden = true;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);

    facade.unmount();
  });

  it('pauses the lesson while a room announcement is active and waits before resuming', async () => {
    vi.useFakeTimers();
    const stage = document.createElement('section');
    const announcement = document.createElement('section');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['purchase-house'],
        }),
      }),
    });

    announcement.className = 'room-announcement-layer';
    announcement.hidden = true;
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(announcement);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    try {
      expect(facade.activeStep?.id).toBe('intro-welcome');
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);

      announcement.hidden = false;
      await Promise.resolve();

      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);

      announcement.hidden = true;
      await Promise.resolve();

      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);

      vi.advanceTimersByTime(999);
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);

      vi.advanceTimersByTime(1);
      facade.refresh();

      expect(facade.activeStep?.id).toBe('intro-welcome');
      expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    } finally {
      facade.unmount();
      vi.useRealTimers();
    }
  });

  it('auto-advances the selected fast-sell amount explanation', () => {
    vi.useFakeTimers();
    const stage = document.createElement('section');
    const popup = document.createElement('section');
    const amount = document.createElement('button');
    const plusOne = document.createElement('button');
    const item = document.createElement('button');
    const sell = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSaleSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'shop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: LEVEL_TWO_SELECTED_SALE_STEP_IDS,
        }),
      }),
    });

    popup.className = 'shop-page__direct-sell-popup';
    amount.dataset.tutorialId = 'shop:directSell:amount';
    amount.textContent = '5';
    plusOne.dataset.tutorialId = 'shop:directSell:amount:+1';
    plusOne.textContent = '+1';
    item.className = 'shop-page__direct-sell-item-button';
    item.dataset.directSellItemKey = 'sageSeed';
    item.dataset.tutorialId = 'shop:directSell:sageSeed';
    item.setAttribute('aria-pressed', 'true');
    sell.dataset.tutorialId = 'shop:directSell:sell';
    popup.append(amount, plusOne, item, sell);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(amount, { left: 420, top: 560, width: 120, height: 54 });
    setClientRect(plusOne, { left: 550, top: 560, width: 80, height: 54 });
    setClientRect(sell, { left: 680, top: 560, width: 140, height: 54 });
    stage.append(popup);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('show-selected-sale-amount');
    expect(facade.progressManager.hasCompleted('show-selected-sale-amount')).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(true);
    expect(amount.classList.contains('is-tutorial-target-emphasized')).toBe(true);
    expect(amount.getAttribute('data-tutorial-target-emphasis')).toBe('true');

    vi.advanceTimersByTime(1999);

    expect(facade.activeStep?.id).toBe('show-selected-sale-amount');

    vi.advanceTimersByTime(1);

    expect(facade.progressManager.hasCompleted('show-selected-sale-amount')).toBe(true);
    expect(facade.activeStep?.id).toBe('earn-tutorial-coin');
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);

    facade.unmount();
  });

  it('keeps level three guidance passive until the player is idle', () => {
    let now = 1_000;
    const stage = document.createElement('section');
    const researchButton = document.createElement('button');
    const snapshot = createLevelThreeSnapshot();
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'research',
      storage: createMemoryStorage(),
      now: () => now,
    });

    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(researchButton, { left: 48, top: 120, width: 360, height: 90 });
    researchButton.dataset.tutorialId = 'research:unlockSeed:mintSeed';
    stage.append(researchButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const button = stage.querySelector('.tutorial-layer__lesson-button');
    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const hint = stage.querySelector('.tutorial-layer__hint');

    expect(button?.hidden).toBe(false);
    expect(lesson?.hidden).toBe(true);
    expect(hint?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);

    now += TUTORIAL_HINT_REMINDER_MS;
    facade.refresh();

    expect(hint?.hidden).toBe(true);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.hasAttribute('data-attention')).toBe(true);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(lesson?.hidden).toBe(false);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);

    facade.unmount();
  });

  it('keeps one lesson box visible while cueing its target', () => {
    const stage = document.createElement('section');
    const tasks = document.createElement('section');
    const taskButton = document.createElement('button');
    const summonButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneObjectiveSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: [
            'purchase-house',
            'intro-welcome',
            'intro-mana-sphere',
            'first-summon-seed',
            'first-fill-seed-task',
          ],
        }),
      }),
    });

    tasks.dataset.tutorialId = 'workshop:tasks';
    tasks.setAttribute('aria-expanded', 'true');
    taskButton.dataset.tutorialId = 'task:level1-turn-in-sage-seed';
    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(tasks, { left: 48, top: 660, width: 900, height: 280 });
    setClientRect(taskButton, { left: 64, top: 720, width: 760, height: 70 });
    setClientRect(summonButton, { left: 400, top: 1230, width: 280, height: 100 });
    stage.append(tasks, taskButton, summonButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const hint = stage.querySelector('.tutorial-layer__hint');
    const showButton = stage.querySelector('.tutorial-layer__lesson-show');

    expect(facade.activeStep?.id).toBe('finish-seed-task');
    expect(facade.activeStep?.targetId).toBe('task:level1-turn-in-sage-seed');
    expect(lesson?.hidden).toBe(false);
    expect(hint?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);
    expect(showButton?.hidden).toBe(true);
    expect([lesson, hint].filter((element) => element && !element.hidden)).toHaveLength(1);

    facade.unmount();
  });

  it('shows first grow sage pointer after a short idle delay', () => {
    let now = 1_000;
    const snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      seedSummoning: { canSummon: true },
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: { tiles: [] },
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 16 },
          tasks: [
            {
              taskId: 'level4-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 0,
              remainingQuantity: 2,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const stage = document.createElement('section');
    const summonButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-garden'],
        }),
      }),
      now: () => now,
    });

    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(summonButton, { left: 140, top: 420, width: 420, height: 70 });
    stage.append(summonButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(true);

    now += TUTORIAL_LESSON_THREE_STUCK_MS;
    facade.refresh();

    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);

    facade.unmount();
  });

  it('targets garden after level two requirements are expanded', () => {
    let currentPageId = 'workshop';
    const shownPages = [];
    const snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 1 }],
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 16 },
          tasks: [
            {
              taskId: 'level4-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 0,
              remainingQuantity: 2,
              canFill: false,
              canComplete: false,
              completed: false,
            },
            {
              taskId: 'level4-sage-seeds',
              itemKey: 'sageSeed',
              requiredQuantity: 6,
              progressQuantity: 0,
              remainingQuantity: 6,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const stage = document.createElement('section');
    const tasksToggle = document.createElement('button');
    const tasksPin = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => currentPageId,
      onShowPage: (pageId) => {
        shownPages.push(pageId);
        currentPageId = pageId;
      },
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: [...LEVEL_ONE_COMPLETED_STEP_IDS, 'intro-garden'],
        }),
      }),
    });

    tasksToggle.className = 'workshop-page__tasks-toggle';
    tasksToggle.dataset.tutorialId = 'workshop:tasks';
    tasksToggle.setAttribute('aria-expanded', 'true');
    tasksPin.className = 'workshop-page__tasks-pin';
    tasksPin.dataset.tutorialId = 'workshop:tasksPin';
    tasksPin.setAttribute('aria-pressed', 'false');
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(tasksToggle, tasksPin);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(facade.activeStep?.targetId).toBe('workshop:tasksPin');
    expect(shownPages).toEqual([]);

    tasksPin.setAttribute('aria-pressed', 'true');
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(facade.activeStep?.targetId).toBe('page:garden');
    expect(shownPages).toEqual([]);

    facade.unmount();
  });

  it('delays later grow sage target help until the player is stuck', () => {
    let now = 1_000;
    const snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      seedSummoning: { canSummon: true },
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: { tiles: [] },
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 16 },
          tasks: [
            {
              taskId: 'level4-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const stage = document.createElement('section');
    const summonButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-garden'],
        }),
      }),
      now: () => now,
    });

    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(summonButton, { left: 140, top: 420, width: 420, height: 70 });
    stage.append(summonButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(true);

    now += TUTORIAL_LESSON_THREE_STUCK_MS;
    facade.refresh();

    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);

    facade.unmount();
  });

  it('places an open lesson away from its show-me target before the target cue is requested', () => {
    const snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      seedSummoning: { canSummon: true },
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: { tiles: [] },
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 16 },
          tasks: [
            {
              taskId: 'level4-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const stage = document.createElement('section');
    const summonButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-garden'],
        }),
        'idle-wizard.tutorial.elaraPlacement.v1': JSON.stringify({
          buttonLeft: 4,
          buttonTop: 420,
        }),
      }),
    });

    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(
      summonButton,
      toClientRect({
        left: 135,
        top: 410,
        width: 92,
        height: 32,
      }),
    );
    stage.append(summonButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const lesson = stage.querySelector('.tutorial-layer__lesson');

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(lesson?.hidden).toBe(false);
    expect(overlaps(getLessonRect(lesson), getSourceAreaRect(summonButton))).toBe(false);

    facade.unmount();
  });

  it('places the grow sage lesson away from the open seed picker target', () => {
    const snapshot = createLevelTwoSageTaskSnapshot();
    const stage = document.createElement('section');
    const bottomPanel = document.createElement('section');
    const popup = document.createElement('section');
    const dialog = document.createElement('section');
    const seedRow = document.createElement('div');
    const seedLabel = document.createElement('span');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'garden',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-garden'],
        }),
      }),
    });

    bottomPanel.className = 'room-bottom-panel';
    popup.className = 'garden-page__seed-popup';
    dialog.className = 'garden-page__seed-dialog style-dialog';
    seedRow.className = 'garden-page__seed-row';
    seedLabel.dataset.tutorialId = 'garden:seed:sageSeed';
    seedRow.append(seedLabel);
    dialog.append(seedRow);
    popup.append(dialog);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(bottomPanel, toClientRect({ left: 0, top: 575, width: 360, height: 145 }));
    setClientRect(dialog, toClientRect({ left: 60, top: 315, width: 240, height: 105 }));
    setClientRect(seedRow, toClientRect({ left: 76, top: 363, width: 208, height: 24 }));
    setClientRect(seedLabel, toClientRect({ left: 90, top: 364, width: 94, height: 20 }));
    stage.append(bottomPanel, popup);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const lesson = stage.querySelector('.tutorial-layer__lesson');

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(facade.activeStep?.targetId).toBe('garden:seed:sageSeed');
    expect(lesson?.hidden).toBe(false);
    expect(overlaps(getLessonRect(lesson), getSourceAreaRect(dialog))).toBe(false);
    expect(overlaps(getLessonRect(lesson), getSourceAreaRect(seedRow))).toBe(false);

    facade.unmount();
  });

  it('keeps show-me target guidance visible across delayed-step refreshes', () => {
    let now = 1_000;
    const snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      seedSummoning: { canSummon: true },
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: { tiles: [] },
      },
      tasks: {
        currentLevel: 3,
        level: {
          completion: { canComplete: false, costCoin: 16 },
          tasks: [
            {
              taskId: 'level4-sage-herb',
              itemKey: 'sageHerb',
              requiredQuantity: 2,
              progressQuantity: 1,
              remainingQuantity: 1,
              canFill: false,
              canComplete: false,
              completed: false,
            },
          ],
        },
      },
    });
    const stage = document.createElement('section');
    const summonButton = document.createElement('button');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-garden'],
        }),
      }),
      now: () => now,
    });

    summonButton.dataset.tutorialId = 'workshop:summonSeed';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(summonButton, { left: 140, top: 420, width: 420, height: 70 });
    stage.append(summonButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const showButton = stage.querySelector('.tutorial-layer__lesson-show');
    const pointer = stage.querySelector('.tutorial-layer__pointer');

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(pointer?.hidden).toBe(true);
    expect(showButton?.hidden).toBe(false);

    showButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(pointer?.hidden).toBe(false);
    expect(showButton?.hidden).toBe(true);
    expect(summonButton.classList.contains('is-tutorial-target-emphasized')).toBe(true);
    expect(summonButton.getAttribute('data-tutorial-target-emphasis')).toBe('true');

    now += 250;
    facade.refresh();

    expect(pointer?.hidden).toBe(false);

    facade.unmount();
  });

  it('hides the lesson pointer while the sage plot is only growing', () => {
    let snapshot = createLevelTwoSageTaskSnapshot();
    const stage = document.createElement('section');
    const plotRow = document.createElement('button');
    const plotFrame = document.createElement('span');
    const gameplayFacade = {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'garden',
      storage: createMemoryStorage(),
    });

    plotRow.dataset.tutorialId = 'garden:plot:1';
    plotFrame.className = 'garden-page__plot-box-frame';
    plotRow.append(plotFrame);
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(plotRow, { left: 160, top: 240, width: 360, height: 180 });
    setClientRect(plotFrame, { left: 190, top: 270, width: 160, height: 120 });
    stage.append(plotRow);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(facade.activeStep?.targetId).toBe('garden:plot:1');
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(true);

    snapshot = createLevelTwoSageTaskSnapshot({
      seedInventory: [{ key: 'sageSeed', quantity: 0 }],
      garden: {
        seeds: [{ key: 'sageSeed', quantity: 0 }],
        herbs: [{ key: 'sageHerb', quantity: 0 }],
        plot: {
          tiles: [
            {
              tileNumber: 1,
              unlocked: true,
              phase: 'growing',
              seedKey: 'sageSeed',
              seedLabel: 'sage seed',
              herbLabel: 'sage',
            },
          ],
        },
      },
    });
    facade.refresh();

    expect(facade.activeStep?.id).toBe('grow-sage');
    expect(facade.activeStep?.objectiveText).toBe('wait for sage to grow');
    expect(facade.activeStep?.targetId).toBeNull();
    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__lesson')?.hidden).toBe(false);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(true);

    facade.unmount();
  });
});

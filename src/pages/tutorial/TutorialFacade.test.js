// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TutorialFacade } from './TutorialFacade.js';
import { TUTORIAL_STORAGE_KEY } from './managers/TutorialProgressManager.js';
import { TUTORIAL_HINT_REMINDER_MS } from './managers/TutorialReminderManager.js';

const UI_SCALE = 3;

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

function createLevelThreeSnapshot() {
  return {
    gold: { current: 0 },
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
      currentLevel: 3,
      level: {
        completion: { canComplete: false, costGold: 80 },
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
      currentLevel: 1,
      level: {
        completion: { canComplete: false, costGold: 10 },
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
      currentLevel: 1,
      level: {
        completion: { canComplete: false, costGold: 10 },
        tasks: [
          {
            taskId: 'level1-sage-seeds',
            itemKey: 'sageSeed',
            requiredQuantity: 10,
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

describe('TutorialFacade', () => {
  afterEach(() => {
    document.body.textContent = '';
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

    expect(facade.activeStep?.id).toBe('intro-welcome');
    expect(stage.dataset.tutorialReveal).toBe('');
    expect(stage.hasAttribute('data-tutorial-reveal')).toBe(true);

    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });

    target.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(underlyingClicks).toBe(0);
    expect(facade.progressManager.hasCompleted('intro-welcome')).toBe(true);

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
      storage: createMemoryStorage(),
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
      storage: createMemoryStorage(),
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

  it('keeps the tutorial reveal gate while the username settings dialog is open', async () => {
    const stage = document.createElement('section');
    const usernameButton = document.createElement('button');
    const settings = document.createElement('section');
    const gameplayFacade = {
      getSnapshot: () => createLevelOneSnapshot(),
      subscribe: () => () => {},
    };
    const facade = new TutorialFacade({
      gameplayFacade,
      getCurrentPageId: () => 'workshop',
      storage: createMemoryStorage({
        [TUTORIAL_STORAGE_KEY]: JSON.stringify({
          completedStepIds: ['intro-welcome'],
        }),
      }),
    });

    usernameButton.dataset.tutorialId = 'top:username';
    usernameButton.textContent = 'wizard';
    settings.className = 'room-top-panel__settings';
    settings.hidden = true;
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(usernameButton, settings);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('intro-username');
    expect(stage.dataset.tutorialReveal).toBe('top');

    settings.hidden = false;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(true);
    expect(stage.dataset.tutorialReveal).toBe('top');

    settings.hidden = true;
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

    expect(stage.querySelector('.tutorial-layer')?.hidden).toBe(false);
    expect(stage.dataset.tutorialReveal).toBe('top');

    facade.unmount();
  });

  it('keeps typed lesson text fixed after closing the username settings dialog', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const usernameButton = document.createElement('button');
      const settings = document.createElement('section');
      const gameplayFacade = {
        getSnapshot: () => createLevelOneSnapshot(),
        subscribe: () => () => {},
      };
      const facade = new TutorialFacade({
        gameplayFacade,
        getCurrentPageId: () => 'workshop',
        storage: createMemoryStorage({
          [TUTORIAL_STORAGE_KEY]: JSON.stringify({
            completedStepIds: ['intro-welcome'],
          }),
        }),
      });

      usernameButton.dataset.tutorialId = 'top:username';
      usernameButton.textContent = 'wizard';
      settings.className = 'room-top-panel__settings';
      settings.hidden = true;
      stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
      setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
      stage.append(usernameButton, settings);
      document.body.append(stage);

      facade.mount(stage);
      facade.refresh();

      const layer = stage.querySelector('.tutorial-layer');
      const copy = stage.querySelector('.tutorial-layer__lesson-text');
      const fullText = copy?.getAttribute('aria-label');

      expect(facade.activeStep?.id).toBe('intro-username');
      expect(copy?.textContent).toBe('');
      expect(fullText).toBe("i don't need your name, but it would be nice to set it here.");

      vi.advanceTimersByTime(1_000);

      expect(copy?.textContent).toBe(fullText);

      settings.hidden = false;
      facade.refresh();

      expect(layer?.hidden).toBe(true);
      expect(copy?.textContent).toBe(fullText);

      settings.hidden = true;
      facade.refresh();

      expect(layer?.hidden).toBe(false);
      expect(copy?.textContent).toBe(fullText);

      facade.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets the username target open settings while waiting for the saved name', () => {
    let usernameClicks = 0;
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
          completedStepIds: ['intro-welcome'],
        }),
      }),
    });

    usernameButton.dataset.tutorialId = 'top:username';
    usernameButton.textContent = 'wizard';
    usernameButton.addEventListener('click', () => {
      usernameClicks += 1;
    });
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    stage.append(usernameButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    expect(facade.activeStep?.id).toBe('intro-username');

    const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });

    usernameButton.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
    expect(usernameClicks).toBe(1);
    expect(facade.progressManager.hasCompleted('intro-welcome')).toBe(true);
    expect(facade.progressManager.hasCompleted('intro-username')).toBe(false);

    usernameButton.textContent = 'Mira';
    facade.refresh();

    expect(facade.progressManager.hasCompleted('intro-username')).toBe(true);
    expect(facade.activeStep?.id).toBe('intro-username-return');

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
            'intro-welcome',
            'intro-username',
            'intro-username-return',
            'intro-mana-sphere',
            'first-summon-seed',
            'first-fill-seed-task',
          ],
        }),
      }),
    });

    tasks.dataset.tutorialId = 'workshop:tasks';
    tasks.setAttribute('aria-expanded', 'true');
    taskButton.dataset.tutorialId = 'task:level1-sage-seeds';
    stage.style.setProperty('--style-ui-scale', String(UI_SCALE));
    setClientRect(stage, { left: 0, top: 0, width: 1080, height: 2160 });
    setClientRect(tasks, { left: 48, top: 660, width: 900, height: 280 });
    setClientRect(taskButton, { left: 64, top: 720, width: 760, height: 70 });
    stage.append(tasks, taskButton);
    document.body.append(stage);

    facade.mount(stage);
    facade.refresh();

    const lesson = stage.querySelector('.tutorial-layer__lesson');
    const hint = stage.querySelector('.tutorial-layer__hint');

    expect(facade.activeStep?.id).toBe('finish-seed-task');
    expect(lesson?.hidden).toBe(false);
    expect(hint?.hidden).toBe(true);
    expect(stage.querySelector('.tutorial-layer__pointer')?.hidden).toBe(false);
    expect([lesson, hint].filter((element) => element && !element.hidden)).toHaveLength(1);

    facade.unmount();
  });
});

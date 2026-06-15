// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { TutorialFacade } from './TutorialFacade.js';
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

describe('TutorialFacade', () => {
  afterEach(() => {
    document.body.textContent = '';
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

    const button = stage.querySelector('.tutorial-layer__objective-button');
    const objective = stage.querySelector('.tutorial-layer__objective');
    const hint = stage.querySelector('.tutorial-layer__hint');

    expect(button?.hidden).toBe(false);
    expect(objective?.hidden).toBe(true);
    expect(hint?.hidden).toBe(true);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);

    now += TUTORIAL_HINT_REMINDER_MS;
    facade.refresh();

    expect(hint?.hidden).toBe(true);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.hasAttribute('data-attention')).toBe(true);

    button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(objective?.hidden).toBe(false);
    expect(button?.dataset.notification).toBeUndefined();
    expect(button?.hasAttribute('data-attention')).toBe(false);

    facade.unmount();
  });
});

import { describe, expect, it } from 'vitest';

import { TutorialLogicManager } from './TutorialLogicManager.js';

function createStep(overrides = {}) {
  return {
    id: 'finish-seed-task',
    kind: 'objective',
    targetId: 'task:level1-sage-seeds',
    objectiveText: 'summon seeds and fill the level task',
    stepLabel: '7/25',
    progress: { value: 1, max: 6 },
    progressLabel: '1/6 seeds',
    cueMode: 'active',
    showPointer: true,
    revealTokens: ['mana', 'summon', 'tasks'],
    ...overrides,
  };
}

function createReminderFake({
  hintState = { shouldShow: true, nextRefreshAt: 500 },
  attentionState = { shouldNotify: false, nextRefreshAt: 500 },
} = {}) {
  return {
    clearVisibleCount: 0,
    discardCount: 0,
    activityCount: 0,
    getHintState: () => hintState,
    getAttentionState: () => attentionState,
    clearVisible() {
      this.clearVisibleCount += 1;
    },
    discardActivePrompt() {
      this.discardCount += 1;
    },
    recordActivity() {
      this.activityCount += 1;
    },
  };
}

function createManager({ step, reminderManager = createReminderFake() } = {}) {
  const completed = [];
  const stepManager = {
    advanceStep: (stepId) => completed.push(stepId),
    getActiveStep: () => step,
  };
  const manager = new TutorialLogicManager({
    progressManager: { reset: () => {} },
    reminderManager,
    stepManager,
  });

  return { completed, manager, reminderManager };
}

describe('TutorialLogicManager', () => {
  it('returns one target cue for a newly started active objective', () => {
    const target = {};
    const step = createStep();
    const { manager } = createManager({ step });

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    expect(viewState).toMatchObject({
      kind: 'lesson',
      revealTokens: ['mana', 'summon', 'tasks'],
      lesson: {
        id: 'finish-seed-task',
        title: undefined,
        autoOpen: true,
      },
      cue: {
        kind: 'target-cue',
        target,
        showPointer: true,
      },
    });
  });

  it('uses reminder attention after the same lesson panel is closed', () => {
    const target = {};
    const step = createStep();
    const { manager } = createManager({ step });

    manager.activeStep = step;

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    expect(viewState.cue).toMatchObject({
      kind: 'none',
      lessonAttention: true,
      nextRefreshAt: 500,
    });
  });

  it('keeps passive objectives quiet until attention state says otherwise', () => {
    const target = {};
    const step = createStep({
      cueMode: 'passive',
      text: 'research mint seed',
    });
    const reminderManager = createReminderFake({
      attentionState: { shouldNotify: true, nextRefreshAt: null },
    });
    const { manager } = createManager({ reminderManager, step });

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    expect(viewState).toMatchObject({
      kind: 'lesson',
      lesson: {
        autoOpen: false,
      },
      cue: {
        kind: 'none',
        lessonAttention: true,
        nextRefreshAt: null,
      },
    });
  });

  it('delays target cues while a delayed objective panel is open', () => {
    const target = {};
    const step = createStep({
      cueMode: 'delayed-target',
      text: 'grow sage 3 times',
    });
    const waitingReminder = createReminderFake({
      attentionState: { shouldNotify: false, nextRefreshAt: 4500 },
    });
    const readyReminder = createReminderFake({
      attentionState: { shouldNotify: true, nextRefreshAt: null },
    });
    const { manager: waitingManager } = createManager({
      reminderManager: waitingReminder,
      step,
    });
    const { manager: readyManager } = createManager({
      reminderManager: readyReminder,
      step,
    });

    expect(
      waitingManager.getViewState({
        snapshot: {},
        dom: {},
        targetResolver: () => target,
        lessonPanelOpen: true,
      }).cue,
    ).toEqual({
      kind: 'none',
      lessonAttention: false,
      hideTargetImmediate: true,
      nextRefreshAt: 4500,
    });

    expect(
      readyManager.getViewState({
        snapshot: {},
        dom: {},
        targetResolver: () => target,
        lessonPanelOpen: true,
      }).cue,
    ).toMatchObject({
      kind: 'target-cue',
      target,
      showPointer: true,
    });
  });

  it('keeps a delayed objective visible when the player is only waiting', () => {
    const step = createStep({
      cueMode: 'delayed-target',
      targetId: null,
      objectiveText: 'wait for sage',
      text: 'wait for sage',
    });
    const { manager } = createManager({ step });

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => null,
      lessonPanelOpen: true,
    });

    expect(viewState).toMatchObject({
      kind: 'lesson',
      lesson: {
        id: 'finish-seed-task',
        text: 'wait for sage',
        autoOpen: true,
        canShowTarget: false,
      },
      cue: {
        kind: 'none',
        lessonAttention: false,
      },
    });
  });

  it('advances only active click-through steps', () => {
    const step = createStep({
      kind: 'prompt',
      advanceOnClick: true,
    });
    const { completed, manager, reminderManager } = createManager({ step });

    manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => ({}),
    });

    expect(manager.advanceActiveStep()).toBe(true);
    expect(completed).toEqual(['finish-seed-task']);
    expect(reminderManager.discardCount).toBe(1);
    expect(manager.advanceActiveStep()).toBe(false);
  });
});

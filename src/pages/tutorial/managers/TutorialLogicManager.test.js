import { describe, expect, it } from 'vitest';

import { TutorialLogicManager } from './TutorialLogicManager.js';

function createStep(overrides = {}) {
  return {
    id: 'finish-seed-task',
    kind: 'objective',
    targetId: 'task:level1-sage-seeds',
    objectiveText: 'summon and turn in sage seeds for the next level',
    stepLabel: '7/25',
    progress: { value: 1, max: 5 },
    progressLabel: '1/5 seeds',
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
        canShowTarget: false,
      },
      cue: {
        kind: 'target-cue',
        target,
        showPointer: true,
      },
    });
  });

  it('keeps focus-target steps collapsed while pointing at the target', () => {
    const target = {};
    const step = createStep({
      id: 'focus-target-fixture',
      kind: 'prompt',
      targetId: 'top:settings',
      text: "open settings.",
      progress: null,
      progressLabel: '',
      cueMode: 'focus-target',
      revealTokens: ['top'],
    });
    const { manager, reminderManager } = createManager({ step });

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    expect(viewState).toMatchObject({
      kind: 'lesson',
      lesson: {
        id: 'focus-target-fixture',
        autoOpen: false,
        forceOpen: false,
      },
      cue: {
        kind: 'target-cue',
        target,
        showPointer: true,
      },
    });
    expect(reminderManager.clearVisibleCount).toBe(1);
  });

  it('does not suppress a new focus-target cue because the previous lesson was open', () => {
    const target = {};
    let activeStep = createStep({
      id: 'intro-welcome',
      kind: 'prompt',
      targetId: null,
      text: "i'm Elara. let's get the workshop running.",
      advanceOnClick: true,
      progress: null,
      progressLabel: '',
    });
    const manager = new TutorialLogicManager({
      progressManager: { reset: () => {} },
      reminderManager: createReminderFake(),
      stepManager: {
        advanceStep: () => {},
        getActiveStep: () => activeStep,
      },
    });

    manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => null,
      lessonPanelOpen: false,
    });

    activeStep = createStep({
      id: 'focus-target-fixture',
      kind: 'prompt',
      targetId: 'top:settings',
      text: "open settings.",
      progress: null,
      progressLabel: '',
      cueMode: 'focus-target',
      revealTokens: ['top'],
    });

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: true,
    });

    expect(viewState).toMatchObject({
      kind: 'lesson',
      lesson: {
        id: 'focus-target-fixture',
        autoOpen: false,
        forceOpen: false,
      },
      cue: {
        kind: 'target-cue',
        target,
        showPointer: true,
      },
    });
  });

  it('hides focus-target cues while the lesson is open until show me is requested', () => {
    const target = {};
    const step = createStep({
      id: 'focus-target-fixture',
      kind: 'prompt',
      targetId: 'top:settings',
      text: "open settings.",
      progress: null,
      progressLabel: '',
      cueMode: 'focus-target',
      revealTokens: ['top'],
    });
    const { manager } = createManager({ step });

    manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    const openState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: true,
    });

    expect(openState.lesson.canShowTarget).toBe(true);
    expect(openState.cue).toEqual({
      kind: 'none',
      lessonAttention: false,
      nextRefreshAt: null,
    });

    expect(
      manager.getViewState({
        snapshot: {},
        dom: {},
        targetResolver: () => target,
        lessonPanelOpen: true,
        requestedTargetGuidanceStepId: 'focus-target-fixture',
      }).cue,
    ).toMatchObject({
      kind: 'target-cue',
      target,
      showPointer: true,
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

  it('delays target cues from a new step target when requested', () => {
    const target = {};
    const step = createStep({
      id: 'first-summon-seed',
      kind: 'prompt',
      targetId: 'workshop:summonSeed',
      text: 'use your mana to summon seeds.',
      progress: null,
      progressLabel: '',
      targetCueDelayMs: 2000,
    });
    const { manager, reminderManager } = createManager({ step });

    const waitingState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      now: 1000,
    });

    expect(waitingState).toMatchObject({
      kind: 'lesson',
      lesson: {
        canShowTarget: false,
      },
      cue: {
        kind: 'none',
        lessonAttention: false,
        hideTargetImmediate: true,
        targetCueDelayed: true,
        nextRefreshAt: 3000,
      },
      nextRefreshAt: 3000,
    });
    expect(reminderManager.clearVisibleCount).toBe(1);

    const readyState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver: () => target,
      lessonPanelOpen: true,
      now: 3000,
    });

    expect(readyState.cue).toMatchObject({
      kind: 'target-cue',
      target,
      showPointer: true,
    });
  });

  it('lets requested guidance bypass a target cue delay', () => {
    const target = {};
    const step = createStep({
      id: 'first-summon-seed',
      kind: 'prompt',
      targetId: 'workshop:summonSeed',
      text: 'use your mana to summon seeds.',
      progress: null,
      progressLabel: '',
      targetCueDelayMs: 2000,
    });
    const { manager } = createManager({ step });

    expect(
      manager.getViewState({
        snapshot: {},
        dom: {},
        targetResolver: () => target,
        lessonPanelOpen: true,
        requestedTargetGuidanceStepId: 'first-summon-seed',
        now: 1000,
      }).cue,
    ).toMatchObject({
      kind: 'target-cue',
      target,
      showPointer: true,
    });
  });

  it('delays target cues while a delayed objective panel is open', () => {
    const target = {};
    const step = createStep({
      cueMode: 'delayed-target',
      text: 'grow sage',
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

  it('keeps a delayed target cue visible after the player asks for guidance', () => {
    const target = {};
    const step = createStep({
      cueMode: 'delayed-target',
      text: 'grow sage',
    });
    const reminderManager = createReminderFake({
      attentionState: { shouldNotify: false, nextRefreshAt: 4500 },
    });
    const { manager } = createManager({
      reminderManager,
      step,
    });

    expect(
      manager.getViewState({
        snapshot: {},
        dom: {},
        targetResolver: () => target,
        lessonPanelOpen: true,
        requestedTargetGuidanceStepId: step.id,
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
      objectiveText: 'wait for sage to grow',
      text: 'wait for sage to grow',
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
        text: 'wait for sage to grow',
        autoOpen: true,
        canShowTarget: false,
      },
      cue: {
        kind: 'none',
        lessonAttention: false,
      },
    });
  });

  it('auto-advances timed steps after their delay', () => {
    const amountTarget = {};
    const sellTarget = {};
    const completed = [];
    const timedStep = createStep({
      id: 'show-selected-sale-amount',
      targetId: 'shop:directSell:amount',
      objectiveText: 'this number is the amount selected to sell.',
      showPointer: false,
      emphasizeTarget: true,
      autoAdvanceMs: 2000,
    });
    const sellStep = createStep({
      id: 'earn-tutorial-coin',
      targetId: 'shop:directSell:sell',
      objectiveText: 'press sell',
    });
    const reminderManager = createReminderFake();
    const manager = new TutorialLogicManager({
      progressManager: { reset: () => {} },
      reminderManager,
      stepManager: {
        advanceStep: (stepId) => completed.push(stepId),
        getActiveStep: () => (completed.includes(timedStep.id) ? sellStep : timedStep),
      },
    });
    const targetResolver = (targetId) =>
      targetId === 'shop:directSell:amount' ? amountTarget : sellTarget;

    const waitingState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver,
      now: 1000,
    });

    expect(waitingState).toMatchObject({
      kind: 'lesson',
      step: {
        id: 'show-selected-sale-amount',
      },
      cue: {
        target: amountTarget,
        showPointer: false,
        emphasizeTarget: true,
      },
      nextRefreshAt: 3000,
    });
    expect(completed).toEqual([]);

    const advancedState = manager.getViewState({
      snapshot: {},
      dom: {},
      targetResolver,
      lessonPanelOpen: true,
      now: 3000,
    });

    expect(completed).toEqual(['show-selected-sale-amount']);
    expect(reminderManager.discardCount).toBe(1);
    expect(advancedState).toMatchObject({
      kind: 'lesson',
      step: {
        id: 'earn-tutorial-coin',
      },
      cue: {
        target: sellTarget,
      },
    });
  });

  it('passes the resolved target into popup blocker checks', () => {
    const target = {};
    const step = createStep({
      targetId: 'shop:directSell:sageSeed',
    });
    const { manager } = createManager({ step });
    let blockerTarget = null;

    const viewState = manager.getViewState({
      snapshot: {},
      dom: {
        isNonSettingsBlockingDialogOpen: () => false,
        isBlockingDialogOpenForStep: (_step, resolvedTarget) => {
          blockerTarget = resolvedTarget;
          return false;
        },
      },
      targetResolver: () => target,
      lessonPanelOpen: false,
    });

    expect(blockerTarget).toBe(target);
    expect(viewState.kind).toBe('lesson');
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

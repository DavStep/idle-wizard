import { TutorialReminderManager } from './TutorialReminderManager.js';
import { TutorialStepManager } from './TutorialStepManager.js';

export class TutorialLogicManager {
  constructor({
    progressManager,
    getCurrentPageId,
    now,
    reminderManager,
    stepManager,
  } = {}) {
    this.getNow = typeof now === 'function' ? now : () => Date.now();
    this.progressManager = progressManager;
    this.reminderManager =
      reminderManager ?? new TutorialReminderManager({ now: this.getNow });
    this.stepManager =
      stepManager ??
      new TutorialStepManager({
        progressManager,
        getCurrentPageId,
      });
    this.activeStep = null;
  }

  getViewState({
    snapshot,
    dom,
    targetResolver = () => null,
    objectivePanelOpen = false,
    lessonPanelOpen = objectivePanelOpen,
    now = this.getNow(),
  } = {}) {
    if (dom?.isBlockingDialogOpen?.()) {
      this.activeStep = null;
      this.reminderManager.discardActivePrompt();
      return this.createEmptyState('blocked');
    }

    const previousStepId = this.activeStep?.id ?? null;
    const step = this.stepManager.getActiveStep({ snapshot, dom });
    const isNewStep = previousStepId !== step?.id;
    this.activeStep = step;

    if (!step) {
      this.reminderManager.clearVisible();
      return this.createEmptyState('hidden');
    }

    const target = targetResolver(step.targetId);
    const autoOpen = step.cueMode !== 'passive';
    const panelOpen = Boolean(lessonPanelOpen || (isNewStep && autoOpen));
    const cue = this.getCueState({
      step,
      target,
      lessonPanelOpen: panelOpen,
      now,
    });

    return {
      kind: 'lesson',
      step,
      revealTokens: step.revealTokens,
      lesson: {
        id: step.id,
        title: step.lessonTitle,
        text: this.getLessonText(step),
        stepLabel: step.stepLabel,
        progress: step.progress,
        progressLabel: step.progressLabel,
        attention: autoOpen || cue.lessonAttention === true,
        autoOpen,
        advanceOnClick: step.advanceOnClick,
        canShowTarget: Boolean(target),
      },
      cue,
      nextRefreshAt: cue.nextRefreshAt,
    };
  }

  createEmptyState(kind) {
    return {
      kind,
      step: null,
      cue: { kind: 'none' },
      nextRefreshAt: null,
      revealTokens: [],
    };
  }

  getCueState({ step, target, lessonPanelOpen, now }) {
    if (!target) {
      this.reminderManager.clearVisible();
      return {
        kind: 'none',
        lessonAttention: false,
        nextRefreshAt: null,
      };
    }

    if (lessonPanelOpen) {
      this.reminderManager.clearVisible();
      return {
        kind: 'target-cue',
        target,
        showPointer: this.shouldShowPointer(step),
        nextRefreshAt: null,
      };
    }

    if (step.cueMode === 'passive') {
      const attentionState = this.reminderManager.getAttentionState({ step, now });
      return {
        kind: 'none',
        lessonAttention: attentionState.shouldNotify,
        nextRefreshAt: attentionState.nextRefreshAt,
      };
    }

    const hintState = this.reminderManager.getHintState({ step, now });

    return {
      kind: 'none',
      lessonAttention: hintState.shouldShow,
      nextRefreshAt: hintState.nextRefreshAt,
    };
  }

  getForcedTargetCue({ step, target } = {}) {
    if (!step || !target) {
      return {
        kind: 'none',
        lessonAttention: false,
        nextRefreshAt: null,
      };
    }

    this.reminderManager.discardActivePrompt();
    return {
      kind: 'target-cue',
      target,
      showPointer: this.shouldShowPointer(step),
      nextRefreshAt: null,
    };
  }

  getLessonText(step) {
    if (step.kind === 'objective') {
      return step.objectiveText ?? step.hintText ?? step.text ?? '';
    }

    return step.text ?? step.hintText ?? step.objectiveText ?? '';
  }

  shouldShowPointer(step) {
    return step?.showPointer !== false && step?.targetId !== 'workshop:manaSphere';
  }

  recordActivity(now = this.getNow()) {
    this.reminderManager.recordActivity(now);
  }

  resetProgress() {
    this.progressManager?.reset?.();
    this.activeStep = null;
    this.reminderManager.discardActivePrompt();
  }

  advanceActiveStep() {
    if (!this.activeStep?.advanceOnClick) {
      return false;
    }

    this.stepManager.advanceStep(this.activeStep.id);
    this.activeStep = null;
    this.reminderManager.discardActivePrompt();
    return true;
  }
}

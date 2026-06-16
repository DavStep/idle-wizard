import { TutorialHintManager } from './managers/TutorialHintManager.js';
import { TutorialLogicManager } from './managers/TutorialLogicManager.js';
import { TutorialProgressManager } from './managers/TutorialProgressManager.js';
import { TutorialRevealManager } from './managers/TutorialRevealManager.js';
import { TutorialSaleManager } from './managers/TutorialSaleManager.js';
import { TutorialTargetManager } from './managers/TutorialTargetManager.js';

export class TutorialFacade {
  static explain =
    'Elara Starbrew teaches early play through one lesson button and panel, with progress and target cues behind it.';

  constructor({ gameplayFacade, getCurrentPageId, storage, now } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.stage = null;
    this.unsubscribe = null;
    this.getNow = typeof now === 'function' ? now : () => Date.now();
    this.progressManager = new TutorialProgressManager({ storage });
    this.targetManager = new TutorialTargetManager();
    this.logicManager = new TutorialLogicManager({
      progressManager: this.progressManager,
      getCurrentPageId,
      now: this.getNow,
    });
    this.stepManager = this.logicManager.stepManager;
    this.hintManager = new TutorialHintManager();
    this.revealManager = new TutorialRevealManager();
    this.reminderManager = this.logicManager.reminderManager;
    this.saleManager = new TutorialSaleManager();
    this.animationFrame = null;
    this.reminderTimeout = null;
    this.blockingDialogObserver = null;
    this.activeStep = null;
    this.handleClick = (event) => {
      if (event.target?.closest?.('.tutorial-layer')) {
        return;
      }

      if (this.activeStep?.advanceOnClick) {
        const step = this.activeStep;
        const targetId = event.target?.closest?.('[data-tutorial-id]')?.dataset?.tutorialId;
        const allowTargetClick = step.allowTargetClick === true && targetId === step.targetId;

        if (!allowTargetClick) {
          event.preventDefault();
          event.stopPropagation();
        }

        this.advanceActiveStep();
        return;
      }

      this.logicManager.recordActivity(this.getNow());
      this.hintManager.hideTargetCue();
      this.scheduleRefresh();
    };
    this.handleAdvance = () => this.advanceActiveStep();
    this.handleObjectivePress = () => this.pressActiveLesson();
    this.handleResize = () => this.scheduleRefresh();
  }

  mount(stage) {
    if (!this.gameplayFacade) {
      return;
    }

    this.stage = stage;
    this.targetManager.setStage(stage);
    this.revealManager.setStage(stage);
    this.hintManager.mount(stage);
    this.hintManager.setAdvanceHandler(this.handleAdvance);
    this.hintManager.setObjectivePressHandler(this.handleObjectivePress);
    this.unsubscribe = this.gameplayFacade.subscribe(() => this.scheduleRefresh());
    stage.addEventListener('click', this.handleClick, true);
    window.addEventListener('resize', this.handleResize);
    this.watchBlockingDialogs();
    this.scheduleRefresh();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.disconnectBlockingDialogObserver();
    this.saleManager.cancel();
    this.stage?.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('resize', this.handleResize);
    this.hintManager.setAdvanceHandler(null);
    this.hintManager.setObjectivePressHandler(null);
    this.hintManager.unmount();
    this.revealManager.setStage(null);
    this.targetManager.setStage(null);
    this.stage = null;
  }

  resetProgress() {
    this.logicManager.resetProgress();
    this.activeStep = null;
    this.scheduleRefresh();
  }

  refresh() {
    this.cancelReminderRefresh();
    const dom = this.targetManager.getDomState();
    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const viewState = this.logicManager.getViewState({
      snapshot,
      dom,
      targetResolver: (targetId) => this.targetManager.getTarget(targetId),
      lessonPanelOpen: this.hintManager.isLessonPanelOpen(),
    });
    this.activeStep = viewState.step;
    this.applyViewState(viewState, snapshot);
  }

  applyViewState(viewState, snapshot) {
    if (viewState.kind === 'blocked') {
      this.saleManager.cancel();
      this.hintManager.suspendForBlockingDialog();
      return;
    }

    if (viewState.kind === 'hidden') {
      this.saleManager.cancel();
      this.revealManager.clear();
      this.hintManager.hide();
      return;
    }

    this.revealManager.update(viewState);

    if (viewState.kind === 'lesson') {
      this.hintManager.showLesson({
        ...viewState.lesson,
        hideTargetCue: false,
      });
      this.saleManager.update({
        step: viewState.step,
        snapshot,
        dom: this.targetManager.getDomState(),
        gameplayFacade: this.gameplayFacade,
        onChange: () => this.scheduleRefresh(),
      });
      this.applyCue(viewState.cue);
      this.scheduleReminderRefresh(viewState.nextRefreshAt);
      return;
    }

    this.saleManager.cancel();
    this.applyCue(viewState.cue);
    this.scheduleReminderRefresh(viewState.nextRefreshAt);
  }

  applyCue(cue = { kind: 'none' }) {
    if (cue.kind === 'target-cue') {
      this.hintManager.showTargetCue({
        target: cue.target,
        showPointer: cue.showPointer,
      });
      return;
    }

    if (cue.lessonAttention !== undefined) {
      this.hintManager.setLessonAttention(cue.lessonAttention);
    }

    this.hintManager.hideTargetCue();
  }

  advanceActiveStep() {
    if (!this.logicManager.advanceActiveStep()) {
      return;
    }

    this.activeStep = null;
    this.hintManager.hideTargetCue();
    this.scheduleRefresh();
  }

  pressActiveLesson() {
    const step = this.activeStep;

    if (!step) {
      return;
    }

    const target = this.targetManager.getTarget(step.targetId);

    if (this.shouldClickObjectiveTarget(step, target)) {
      this.hintManager.closeLessonPanel();
      target.click();
      this.scheduleRefresh();
      return;
    }

    this.showTargetNow(step);
  }

  shouldClickObjectiveTarget(step, target) {
    const ButtonElement = target?.ownerDocument?.defaultView?.HTMLButtonElement;

    return (
      Boolean(target) &&
      step?.targetId?.startsWith('task:') &&
      typeof ButtonElement === 'function' &&
      target instanceof ButtonElement &&
      !target.disabled
    );
  }

  showTargetNow(step) {
    const target = this.targetManager.getTarget(step?.targetId);
    this.revealManager.update({
      step,
    });
    const cue = this.logicManager.getForcedTargetCue({ step, target });

    if (cue.kind !== 'target-cue') {
      this.hintManager.hideTargetCue();
      return;
    }

    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.applyCue(cue);
  }

  scheduleRefresh() {
    this.cancelRefresh();
    this.cancelReminderRefresh();

    if (typeof requestAnimationFrame !== 'function') {
      this.refresh();
      return;
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null;
      this.refresh();
    });
  }

  cancelRefresh() {
    if (this.animationFrame === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  scheduleReminderRefresh(nextRefreshAt, now = this.getNow()) {
    if (!Number.isFinite(nextRefreshAt)) {
      return;
    }

    const delayMs = Math.max(0, nextRefreshAt - now);
    this.reminderTimeout = globalThis.setTimeout(() => {
      this.reminderTimeout = null;
      this.refresh();
    }, delayMs);
    this.reminderTimeout?.unref?.();
  }

  cancelReminderRefresh() {
    if (this.reminderTimeout === null) {
      return;
    }

    globalThis.clearTimeout(this.reminderTimeout);
    this.reminderTimeout = null;
  }

  watchBlockingDialogs() {
    const root = this.stage?.ownerDocument?.body;
    const MutationObserverClass = this.stage?.ownerDocument?.defaultView?.MutationObserver;

    if (!root || typeof MutationObserverClass !== 'function') {
      return;
    }

    this.disconnectBlockingDialogObserver();
    this.blockingDialogObserver = new MutationObserverClass((mutations) => {
      if (this.targetManager.hasBlockingDialogMutation(mutations)) {
        this.cancelRefresh();
        this.refresh();
      }
    });
    this.blockingDialogObserver.observe(root, {
      attributes: true,
      attributeFilter: ['hidden'],
      childList: true,
      subtree: true,
    });
  }

  disconnectBlockingDialogObserver() {
    this.blockingDialogObserver?.disconnect?.();
    this.blockingDialogObserver = null;
  }

}

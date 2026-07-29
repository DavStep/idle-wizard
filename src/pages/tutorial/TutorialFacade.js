import { TutorialHintManager } from './managers/TutorialHintManager.js';
import { TutorialLogicManager } from './managers/TutorialLogicManager.js';
import { TutorialProgressManager } from './managers/TutorialProgressManager.js';
import { TutorialSaleManager } from './managers/TutorialSaleManager.js';
import {
  TUTORIAL_ADVANCE_ACTIONS,
  TUTORIAL_STEP_IDS,
  getTutorialStepGraph,
  resolveTutorialStepId,
} from './managers/TutorialStepManager.js';
import { TutorialTargetManager } from './managers/TutorialTargetManager.js';

const POST_ANNOUNCEMENT_TUTORIAL_RESUME_DELAY_MS = 1000;

export class TutorialFacade {
  static explain =
    'Elara Starbrew teaches early play through one lesson button and panel, with progress and target cues behind it.';

  constructor({
    gameplayFacade,
    getCurrentPageId,
    storage,
    now,
    onNotificationVisibilityPolicyChange,
    spineRuntimeFacade = null,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.stage = null;
    this.unsubscribe = null;
    this.frameResourceUnsubscribe = null;
    this.getNow = typeof now === 'function' ? now : () => Date.now();
    this.onNotificationVisibilityPolicyChange = onNotificationVisibilityPolicyChange;
    this.progressManager = new TutorialProgressManager({ storage });
    this.targetManager = new TutorialTargetManager();
    this.logicManager = new TutorialLogicManager({
      progressManager: this.progressManager,
      getCurrentPageId,
      now: this.getNow,
    });
    this.stepManager = this.logicManager.stepManager;
    this.hintManager = new TutorialHintManager({
      storage,
      spineRuntimeFacade,
    });
    this.reminderManager = this.logicManager.reminderManager;
    this.saleManager = new TutorialSaleManager();
    this.animationFrame = null;
    this.reminderTimeout = null;
    this.autoAdvanceTimeout = null;
    this.autoAdvanceStepId = null;
    this.blockingDialogObserver = null;
    this.roomAnnouncementWasOpen = false;
    this.roomAnnouncementResumeDelayActive = false;
    this.roomAnnouncementResumeTimeout = null;
    this.activeStep = null;
    this.requestedTargetGuidanceStepId = null;
    this.notificationVisibilityPolicyKey = '';
    this.handleClick = (event) => {
      if (event.target?.closest?.('.tutorial-layer')) {
        return;
      }

      this.logicManager.recordActivity(this.getNow());
      this.clearRequestedTargetGuidance();
      this.hintManager.hideTargetCue();
      this.scheduleRefresh();
    };
    this.handleAdvance = () => this.advanceActiveStep();
    this.handleObjectivePress = (detail) => this.pressActiveLesson(detail);
    this.handleLessonPanelClose = () => {
      this.cancelRefresh();
      this.refresh();
    };
    this.handleResize = () => this.scheduleRefresh();
    this.handleFrameResources = () => {
      if (this.stepManager.hasCompletedAllSteps()) {
        return;
      }

      this.scheduleRefresh();
    };
  }

  mount(stage) {
    if (!this.gameplayFacade) {
      return;
    }

    this.stage = stage;
    this.targetManager.setStage(stage);
    this.hintManager.mount(stage);
    this.hintManager.setAdvanceHandler(this.handleAdvance);
    this.hintManager.setObjectivePressHandler(this.handleObjectivePress);
    this.hintManager.setLessonPanelCloseHandler(this.handleLessonPanelClose);
    this.unsubscribe = this.gameplayFacade.subscribe(() => this.scheduleRefresh());
    this.frameResourceUnsubscribe =
      this.gameplayFacade.subscribeFrameResources?.(this.handleFrameResources) ?? null;
    stage.addEventListener('click', this.handleClick, true);
    window.addEventListener('resize', this.handleResize);
    this.watchBlockingDialogs();
    this.scheduleRefresh();
  }

  unmount() {
    this.unsubscribe?.();
    this.frameResourceUnsubscribe?.();
    this.unsubscribe = null;
    this.frameResourceUnsubscribe = null;
    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.cancelAutoAdvance();
    this.cancelRoomAnnouncementResumeDelay();
    this.disconnectBlockingDialogObserver();
    this.saleManager.cancel();
    this.stage?.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('resize', this.handleResize);
    this.hintManager.setAdvanceHandler(null);
    this.hintManager.setObjectivePressHandler(null);
    this.hintManager.setLessonPanelCloseHandler(null);
    this.hintManager.unmount();
    this.updateNotificationVisibilityPolicy(null);
    this.targetManager.setStage(null);
    this.roomAnnouncementWasOpen = false;
    this.stage = null;
  }

  resetProgress() {
    this.logicManager.resetProgress();
    this.activeStep = null;
    this.clearRequestedTargetGuidance();
    this.cancelAutoAdvance();
    this.scheduleRefresh();
  }

  listStages() {
    const graph = getTutorialStepGraph();
    return {
      ...graph,
      stages: graph.steps.map((step) => step.id),
    };
  }

  setStage(stageId) {
    const normalizedStageId = String(stageId ?? '').trim();

    if (!normalizedStageId) {
      return { ok: false, reason: 'invalid_stage_id', stageId };
    }

    const lowerStageId = normalizedStageId.toLowerCase();

    if (lowerStageId === 'reset' || lowerStageId === 'start') {
      return this.applyStageCompletedIds([], 'purchase-house');
    }

    if (lowerStageId === 'complete' || lowerStageId === 'done') {
      return this.applyStageCompletedIds([...TUTORIAL_STEP_IDS], null);
    }

    const resolvedStageId = resolveTutorialStepId(normalizedStageId);
    const stageIndex = resolvedStageId ? TUTORIAL_STEP_IDS.indexOf(resolvedStageId) : -1;

    if (stageIndex < 0 || stageIndex >= TUTORIAL_STEP_IDS.length) {
      return {
        ok: false,
        reason: 'unknown_stage',
        stageId,
        stages: [...TUTORIAL_STEP_IDS],
      };
    }

    return this.applyStageCompletedIds(TUTORIAL_STEP_IDS.slice(0, stageIndex), resolvedStageId);
  }

  applyStageCompletedIds(completedStepIds, activeStageId) {
    this.progressManager.setCompletedStepIds(completedStepIds);
    this.logicManager.activeStep = null;
    this.stepManager.activeStepId = null;
    this.activeStep = null;
    this.reminderManager.discardActivePrompt();
    this.clearRequestedTargetGuidance();
    this.cancelAutoAdvance();
    this.hintManager.hideTargetCue?.({ immediate: true });
    this.scheduleRefresh();

    return {
      ok: true,
      stage: activeStageId,
      completedStepIds: [...completedStepIds],
    };
  }

  getNpcSellPriceOverride({ item } = {}) {
    return this.saleManager.getNpcSellPriceOverride({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      item,
      itemKey: item?.key,
    });
  }

  getNpcStockBuyQuoteOverride({ item, quantity } = {}) {
    return this.saleManager.getNpcStockBuyQuoteOverride({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      item,
      itemKey: item?.key,
      quantity,
    });
  }

  refresh() {
    this.cancelReminderRefresh();
    const snapshot = this.gameplayFacade?.getSnapshot?.();

    this.stepManager.syncSnapshotProgress(snapshot);

    if (this.stepManager.hasCompletedAllSteps()) {
      const viewState = this.logicManager.createEmptyState('hidden');
      this.syncRequestedTargetGuidance(viewState, this.hintManager.isLessonPanelOpen());
      this.activeStep = null;
      this.applyViewState(viewState);
      return;
    }

    if (this.shouldHoldForRoomAnnouncementResume()) {
      const viewState = this.logicManager.createEmptyState('blocked');
      this.syncRequestedTargetGuidance(viewState, this.hintManager.isLessonPanelOpen());
      this.logicManager.activeStep = null;
      this.activeStep = null;
      this.applyViewState(viewState);
      return;
    }

    const dom = this.targetManager.getDomState();
    const lessonPanelOpen = this.hintManager.isLessonPanelOpen();
    const viewState = this.logicManager.getViewState({
      snapshot,
      dom,
      targetResolver: (targetId) => this.targetManager.getTarget(targetId),
      lessonPanelOpen,
      requestedTargetGuidanceStepId: this.requestedTargetGuidanceStepId,
    });
    this.syncRequestedTargetGuidance(viewState, lessonPanelOpen);
    this.activeStep = viewState.step;
    this.applyViewState(viewState);
  }

  applyViewState(viewState) {
    this.updateNotificationVisibilityPolicy(
      this.getNotificationVisibilityPolicy(viewState),
    );

    if (viewState.kind === 'blocked') {
      this.clearRequestedTargetGuidance();
      this.cancelAutoAdvance();
      this.saleManager.cancel();
      this.hintManager.suspendForBlockingDialog();
      return;
    }

    if (viewState.kind === 'hidden') {
      this.clearRequestedTargetGuidance();
      this.cancelAutoAdvance();
      this.saleManager.cancel();
      this.hintManager.hide();
      return;
    }

    if (viewState.kind === 'quest') {
      this.clearRequestedTargetGuidance();
      this.cancelAutoAdvance();
      this.saleManager.cancel();
      this.hintManager.hide();
      return;
    }

    if (viewState.kind === 'lesson') {
      const target = viewState.step?.targetId
        ? this.targetManager.getTarget(viewState.step.targetId)
        : null;
      const highlightTargets = this.getHighlightTargets(viewState.step);

      this.hintManager.showLesson({
        ...viewState.lesson,
        target,
        highlightTargets,
        dimBackdrop: viewState.lesson?.advanceOnClick === true,
        hideTargetCue: false,
      });
      this.saleManager.update({
        step: viewState.step,
      });
      this.applyCue(viewState.cue);
      this.scheduleReminderRefresh(viewState.nextRefreshAt);
      this.scheduleAutoAdvance(viewState.step);
      return;
    }

    this.cancelAutoAdvance();
    this.saleManager.cancel();
    this.applyCue(viewState.cue);
    this.scheduleReminderRefresh(viewState.nextRefreshAt);
  }

  applyCue(cue = { kind: 'none' }) {
    if (cue.kind === 'target-cue') {
      this.hintManager.showTargetCue({
        target: cue.target,
        showPointer: cue.showPointer,
        emphasizeTarget: cue.emphasizeTarget === true,
      });
      return;
    }

    if (cue.lessonAttention !== undefined) {
      this.hintManager.setLessonAttention(cue.lessonAttention);
    }

    this.hintManager.hideTargetCue({ immediate: cue.hideTargetImmediate === true });
  }

  getHighlightTargets(step) {
    if (!Array.isArray(step?.highlightTargetIds)) {
      return [];
    }

    return step.highlightTargetIds
      .map((targetId) => this.targetManager.getTarget(targetId))
      .filter(Boolean);
  }

  advanceActiveStep() {
    const step = this.activeStep;
    const advanceAction = step?.advanceAction;

    if (!this.logicManager.advanceActiveStep()) {
      return;
    }

    this.activeStep = null;
    this.clearRequestedTargetGuidance();
    this.cancelAutoAdvance();
    this.hintManager.hideTargetCue();
    this.applyAdvanceAction(advanceAction);

    this.scheduleRefresh();
  }

  applyAdvanceAction(action) {
    if (action !== TUTORIAL_ADVANCE_ACTIONS.EXPAND_WORKSHOP_TASKS) {
      return;
    }

    const target = this.targetManager.getTarget('workshop:tasks');

    if (
      !target ||
      target.hidden ||
      target.disabled ||
      target.getAttribute?.('aria-expanded') === 'true' ||
      typeof target.click !== 'function'
    ) {
      return;
    }

    target.click();
  }

  pressActiveLesson({ source } = {}) {
    const step = this.activeStep;

    if (!step) {
      return;
    }

    this.showTargetNow(step, { emphasize: source === 'show-me' });
  }

  showTargetNow(step, { emphasize = false } = {}) {
    const target = this.targetManager.getTarget(step?.targetId);
    const targetWasVisible = this.hintManager.isTargetVisibleOnScreen(target);
    const cue = this.logicManager.getForcedTargetCue({ step, target });

    if (cue.kind !== 'target-cue') {
      this.hintManager.hideTargetCue();
      return;
    }

    this.requestedTargetGuidanceStepId = step?.id ?? null;
    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.applyCue(cue);

    if (emphasize && targetWasVisible) {
      this.hintManager.emphasizeTarget(target);
    }
  }

  getNotificationVisibilityPolicy(viewState) {
    const step = viewState?.step;

    if (viewState?.kind !== 'lesson' || step?.cueMode === 'passive') {
      return null;
    }

    return {
      active: true,
      allowedTutorialIds: step.targetId ? [step.targetId] : [],
    };
  }

  updateNotificationVisibilityPolicy(policy) {
    const key = getNotificationVisibilityPolicyKey(policy);

    if (this.notificationVisibilityPolicyKey === key) {
      return;
    }

    this.notificationVisibilityPolicyKey = key;
    this.onNotificationVisibilityPolicyChange?.(policy);
  }

  clearRequestedTargetGuidance() {
    this.requestedTargetGuidanceStepId = null;
  }

  syncRequestedTargetGuidance(viewState, lessonPanelOpen) {
    if (!this.requestedTargetGuidanceStepId) {
      return;
    }

    if (
      viewState.kind !== 'lesson' ||
      !lessonPanelOpen ||
      viewState.step?.id !== this.requestedTargetGuidanceStepId
    ) {
      this.clearRequestedTargetGuidance();
    }
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

  scheduleAutoAdvance(step) {
    const stepId = step?.id;
    const autoAdvanceMs = step?.autoAdvanceMs;

    if (!stepId || !Number.isFinite(autoAdvanceMs) || autoAdvanceMs < 0) {
      this.cancelAutoAdvance();
      return;
    }

    if (this.autoAdvanceTimeout !== null && this.autoAdvanceStepId === stepId) {
      return;
    }

    this.cancelAutoAdvance();
    this.autoAdvanceStepId = stepId;
    this.autoAdvanceTimeout = globalThis.setTimeout(() => {
      this.autoAdvanceTimeout = null;
      this.autoAdvanceStepId = null;

      if (this.activeStep?.id !== stepId) {
        return;
      }

      this.stepManager.advanceStep(stepId);
      this.logicManager.activeStep = null;
      this.activeStep = null;
      this.reminderManager.discardActivePrompt();
      this.clearRequestedTargetGuidance();
      this.hintManager.hideTargetCue({ immediate: true });
      this.refresh();
    }, autoAdvanceMs);
    this.autoAdvanceTimeout?.unref?.();
  }

  cancelAutoAdvance() {
    if (this.autoAdvanceTimeout !== null) {
      globalThis.clearTimeout(this.autoAdvanceTimeout);
    }

    this.autoAdvanceTimeout = null;
    this.autoAdvanceStepId = null;
  }

  watchBlockingDialogs() {
    const root = this.stage?.ownerDocument?.body;
    const MutationObserverClass = this.stage?.ownerDocument?.defaultView?.MutationObserver;

    if (!root || typeof MutationObserverClass !== 'function') {
      return;
    }

    this.disconnectBlockingDialogObserver();
    this.blockingDialogObserver = new MutationObserverClass((mutations) => {
      const hasTargetStateMutation = mutations.some(
        (mutation) =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-has-selection',
      );
      if (
        hasTargetStateMutation ||
        this.targetManager.hasBlockingDialogMutation(mutations)
      ) {
        this.cancelRefresh();
        this.refresh();
      }
    });
    this.blockingDialogObserver.observe(root, {
      attributes: true,
      attributeFilter: ['hidden', 'data-has-selection'],
      childList: true,
      subtree: true,
    });
  }

  disconnectBlockingDialogObserver() {
    this.blockingDialogObserver?.disconnect?.();
    this.blockingDialogObserver = null;
  }

  shouldHoldForRoomAnnouncementResume() {
    if (this.isRoomAnnouncementOpen()) {
      this.roomAnnouncementWasOpen = true;
      this.cancelRoomAnnouncementResumeDelay();
      return false;
    }

    if (this.roomAnnouncementWasOpen) {
      this.roomAnnouncementWasOpen = false;
      this.startRoomAnnouncementResumeDelay();
    }

    return this.roomAnnouncementResumeDelayActive;
  }

  isRoomAnnouncementOpen() {
    return Boolean(this.stage?.querySelector?.('.room-announcement-layer:not([hidden])'));
  }

  startRoomAnnouncementResumeDelay() {
    if (this.roomAnnouncementResumeDelayActive) {
      return;
    }

    this.roomAnnouncementResumeDelayActive = true;
    this.roomAnnouncementResumeTimeout = globalThis.setTimeout(() => {
      this.roomAnnouncementResumeDelayActive = false;
      this.roomAnnouncementResumeTimeout = null;
      this.scheduleRefresh();
    }, POST_ANNOUNCEMENT_TUTORIAL_RESUME_DELAY_MS);
    this.roomAnnouncementResumeTimeout?.unref?.();
  }

  cancelRoomAnnouncementResumeDelay() {
    if (this.roomAnnouncementResumeTimeout !== null) {
      globalThis.clearTimeout(this.roomAnnouncementResumeTimeout);
    }

    this.roomAnnouncementResumeTimeout = null;
    this.roomAnnouncementResumeDelayActive = false;
  }

}

function getNotificationVisibilityPolicyKey(policy) {
  if (policy?.active !== true) {
    return '';
  }

  return `active:${(policy.allowedTutorialIds ?? []).join('|')}`;
}

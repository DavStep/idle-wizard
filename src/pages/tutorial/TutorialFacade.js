import { TutorialHintManager } from './managers/TutorialHintManager.js';
import { TutorialProgressManager } from './managers/TutorialProgressManager.js';
import { TutorialReminderManager } from './managers/TutorialReminderManager.js';
import { TutorialStepManager } from './managers/TutorialStepManager.js';
import { TutorialTargetManager } from './managers/TutorialTargetManager.js';

export class TutorialFacade {
  static explain =
    'Points new players at the next real button so they learn the first loop without fake tutorial state.';

  constructor({ gameplayFacade, getCurrentPageId, storage, now } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.stage = null;
    this.unsubscribe = null;
    this.getNow = typeof now === 'function' ? now : () => Date.now();
    this.progressManager = new TutorialProgressManager({ storage });
    this.targetManager = new TutorialTargetManager();
    this.stepManager = new TutorialStepManager({
      progressManager: this.progressManager,
      getCurrentPageId,
    });
    this.hintManager = new TutorialHintManager();
    this.reminderManager = new TutorialReminderManager();
    this.animationFrame = null;
    this.reminderTimeout = null;
    this.handleClick = () => {
      this.reminderManager.recordActivity(this.getNow());
      this.hintManager.hide();
      this.scheduleRefresh();
    };
    this.handleResize = () => this.scheduleRefresh();
  }

  mount(stage) {
    if (!this.gameplayFacade) {
      return;
    }

    this.stage = stage;
    this.targetManager.setStage(stage);
    this.hintManager.mount(stage);
    this.unsubscribe = this.gameplayFacade.subscribe(() => this.scheduleRefresh());
    stage.addEventListener('click', this.handleClick, true);
    window.addEventListener('resize', this.handleResize);
    this.scheduleRefresh();
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.stage?.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('resize', this.handleResize);
    this.hintManager.unmount();
    this.targetManager.setStage(null);
    this.stage = null;
  }

  refresh() {
    this.cancelReminderRefresh();
    const dom = this.targetManager.getDomState();

    if (dom.isBlockingDialogOpen()) {
      this.reminderManager.discardActivePrompt();
      this.hintManager.hide();
      return;
    }

    const step = this.stepManager.getActiveStep({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      dom,
    });
    const target = this.targetManager.getTarget(step?.targetId);

    if (!step || !target) {
      this.reminderManager.clearVisible();
      this.hintManager.hide();
      return;
    }

    const now = this.getNow();
    const hintState = this.reminderManager.getHintState({ step, now });
    this.scheduleReminderRefresh(hintState.nextRefreshAt, now);

    if (!hintState.shouldShow) {
      this.hintManager.hide();
      return;
    }

    this.hintManager.show({
      target,
      text: step.text,
      stepLabel: step.stepLabel,
      showPointer: step.targetId !== 'workshop:manaSphere',
    });
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

}

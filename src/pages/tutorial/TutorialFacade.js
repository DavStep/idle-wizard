import { TutorialHintManager } from './managers/TutorialHintManager.js';
import { TutorialProgressManager } from './managers/TutorialProgressManager.js';
import { TutorialReminderManager } from './managers/TutorialReminderManager.js';
import { TutorialSaleManager } from './managers/TutorialSaleManager.js';
import { TutorialStepManager } from './managers/TutorialStepManager.js';
import { TutorialTargetManager } from './managers/TutorialTargetManager.js';

export class TutorialFacade {
  static explain =
    'Mira gives new players short prompts, then keeps an objective button available while they learn the first loop.';

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
    this.saleManager = new TutorialSaleManager();
    this.animationFrame = null;
    this.reminderTimeout = null;
    this.activeStep = null;
    this.handleClick = (event) => {
      if (event.target?.closest?.('.tutorial-layer__advance')) {
        return;
      }

      this.reminderManager.recordActivity(this.getNow());
      this.hintManager.hidePrompt();
      this.scheduleRefresh();
    };
    this.handleAdvance = () => this.advanceActiveStep();
    this.handleObjectivePress = () => this.pressActiveObjective();
    this.handleResize = () => this.scheduleRefresh();
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
    this.saleManager.cancel();
    this.stage?.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('resize', this.handleResize);
    this.hintManager.setAdvanceHandler(null);
    this.hintManager.setObjectivePressHandler(null);
    this.hintManager.unmount();
    this.targetManager.setStage(null);
    this.stage = null;
  }

  refresh() {
    this.cancelReminderRefresh();
    const dom = this.targetManager.getDomState();

    if (dom.isBlockingDialogOpen()) {
      this.activeStep = null;
      this.saleManager.cancel();
      this.reminderManager.discardActivePrompt();
      this.hintManager.hide();
      return;
    }

    const snapshot = this.gameplayFacade?.getSnapshot?.();
    const step = this.stepManager.getActiveStep({
      snapshot,
      dom,
    });
    this.activeStep = step;

    if (!step) {
      this.saleManager.cancel();
      this.reminderManager.clearVisible();
      this.hintManager.hide();
      return;
    }

    if (step.kind === 'dialog') {
      this.saleManager.cancel();
      this.reminderManager.clearVisible();
      this.hintManager.hideObjective();
      this.hintManager.showDialog({
        text: step.text,
        stepLabel: step.stepLabel,
        advanceOnClick: step.advanceOnClick,
      });
      return;
    }

    if (step.kind === 'objective') {
      this.hintManager.showObjective({
        id: step.id,
        text: step.objectiveText,
        stepLabel: step.stepLabel,
        progress: step.progress,
        progressLabel: step.progressLabel,
      });
      this.saleManager.update({
        step,
        snapshot,
        gameplayFacade: this.gameplayFacade,
        onChange: () => this.scheduleRefresh(),
      });
      this.refreshPrompt(step);
      return;
    }

    this.saleManager.cancel();
    this.hintManager.hideObjective();
    this.refreshPrompt(step);
  }

  refreshPrompt(step) {
    const target = this.targetManager.getTarget(step?.targetId);

    if (!target) {
      this.reminderManager.clearVisible();
      this.hintManager.hidePrompt();
      return;
    }

    if (step.advanceOnClick) {
      this.reminderManager.clearVisible();
      this.hintManager.show({
        target,
        text: step.hintText ?? step.text,
        stepLabel: step.stepLabel,
        showPointer: step.showPointer !== false && step.targetId !== 'workshop:manaSphere',
        showPortrait: step.kind !== 'objective',
        advanceOnClick: true,
      });
      return;
    }

    const now = this.getNow();
    const hintState = this.reminderManager.getHintState({ step, now });
    this.scheduleReminderRefresh(hintState.nextRefreshAt, now);

    if (!hintState.shouldShow) {
      this.hintManager.hidePrompt();
      return;
    }

    this.hintManager.show({
      target,
      text: step.hintText ?? step.text,
      stepLabel: step.stepLabel,
      showPointer: step.showPointer !== false && step.targetId !== 'workshop:manaSphere',
      showPortrait: step.kind !== 'objective',
      advanceOnClick: step.advanceOnClick,
    });
  }

  advanceActiveStep() {
    if (!this.activeStep?.advanceOnClick) {
      return;
    }

    this.stepManager.advanceStep(this.activeStep.id);
    this.activeStep = null;
    this.reminderManager.discardActivePrompt();
    this.hintManager.hidePrompt();
    this.scheduleRefresh();
  }

  pressActiveObjective() {
    const step = this.activeStep;

    if (!step || step.kind !== 'objective') {
      return;
    }

    const target = this.targetManager.getTarget(step.targetId);

    if (this.shouldClickObjectiveTarget(step, target)) {
      this.hintManager.closeObjectivePanel();
      target.click();
      this.scheduleRefresh();
      return;
    }

    this.showPromptNow(step);
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

  showPromptNow(step) {
    const target = this.targetManager.getTarget(step?.targetId);

    if (!target) {
      this.hintManager.closeObjectivePanel();
      this.hintManager.hidePrompt();
      return;
    }

    this.cancelRefresh();
    this.cancelReminderRefresh();
    this.reminderManager.discardActivePrompt();
    this.hintManager.closeObjectivePanel();
    this.hintManager.show({
      target,
      text: step.hintText ?? step.text,
      stepLabel: step.stepLabel,
      showPointer: step.showPointer !== false && step.targetId !== 'workshop:manaSphere',
      showPortrait: step.kind !== 'objective',
      advanceOnClick: step.advanceOnClick,
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

import { TutorialHintManager } from './managers/TutorialHintManager.js';
import { TutorialProgressManager } from './managers/TutorialProgressManager.js';
import { TutorialStepManager } from './managers/TutorialStepManager.js';
import { TutorialTargetManager } from './managers/TutorialTargetManager.js';

export class TutorialFacade {
  static explain =
    'Points new players at the next real button so they learn the first loop without fake tutorial state.';

  constructor({ gameplayFacade, getCurrentPageId, storage } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.stage = null;
    this.unsubscribe = null;
    this.progressManager = new TutorialProgressManager({ storage });
    this.targetManager = new TutorialTargetManager();
    this.stepManager = new TutorialStepManager({
      progressManager: this.progressManager,
      getCurrentPageId,
    });
    this.hintManager = new TutorialHintManager({
      onSkip: () => this.skip(),
    });
    this.animationFrame = null;
    this.handleClick = () => this.scheduleRefresh();
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
    this.stage?.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('resize', this.handleResize);
    this.hintManager.unmount();
    this.targetManager.setStage(null);
    this.stage = null;
  }

  refresh() {
    const step = this.stepManager.getActiveStep({
      snapshot: this.gameplayFacade?.getSnapshot?.(),
      dom: this.targetManager.getDomState(),
    });
    const target = this.targetManager.getTarget(step?.targetId);

    if (!step || !target) {
      this.hintManager.hide();
      return;
    }

    this.hintManager.show({
      target,
      text: step.text,
    });
  }

  scheduleRefresh() {
    this.cancelRefresh();

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

  skip() {
    this.progressManager.skip();
    this.hintManager.hide();
  }
}

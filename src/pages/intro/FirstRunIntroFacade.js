import { FirstRunIntroProgressManager } from './managers/FirstRunIntroProgressManager.js';
import { FirstRunIntroViewManager } from './managers/FirstRunIntroViewManager.js';

export class FirstRunIntroFacade {
  static explain =
    'Shows the opening story before Elara starts teaching, so a new player knows why the workshop matters.';

  constructor({ playerFacade, storage } = {}) {
    this.playerFacade = playerFacade;
    this.progressManager = new FirstRunIntroProgressManager({ storage });
    this.viewManager = new FirstRunIntroViewManager({ playerFacade });
    this.stage = null;
  }

  mount(stage) {
    this.stage = stage;
    this.viewManager.mount(stage);
  }

  unmount() {
    this.viewManager.unmount();
    this.stage = null;
  }

  shouldShow(snapshot = {}) {
    return this.progressManager.isPending() && this.isFreshLevelOneSnapshot(snapshot);
  }

  show({ snapshot, onComplete } = {}) {
    if (!this.shouldShow(snapshot)) {
      this.finishStaleIntro(snapshot);
      onComplete?.({ shown: false });
      return false;
    }

    this.viewManager.show({
      onName: (name) => this.playerFacade?.setUsername?.(name),
      onComplete: () => {
        this.progressManager.markComplete();
        onComplete?.({ shown: true });
      },
    });
    return true;
  }

  markPending() {
    this.progressManager.markPending();
  }

  resetProgress() {
    this.progressManager.reset();
  }

  complete() {
    this.progressManager.markComplete();
  }

  finishStaleIntro(snapshot = {}) {
    if (!this.progressManager.isPending()) {
      return;
    }

    if (!this.isFreshLevelOneSnapshot(snapshot)) {
      this.progressManager.markComplete();
    }
  }

  isFreshLevelOneSnapshot(snapshot = {}) {
    const level = Number(snapshot?.tasks?.currentLevel ?? snapshot?.tasks?.level?.current ?? 1);
    if (Number.isFinite(level) && level > 1) {
      return false;
    }

    return true;
  }
}

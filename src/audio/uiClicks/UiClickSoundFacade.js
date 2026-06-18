import { UiClickSoundManager } from './managers/UiClickSoundManager.js';

export class UiClickSoundFacade {
  static explain =
    'Plays a tiny click when the player presses usable interface controls, so taps feel confirmed.';

  constructor({ manager = new UiClickSoundManager() } = {}) {
    this.manager = manager;
  }

  playClick() {
    this.manager.playClick();
  }

  unlock() {
    this.manager.unlock();
  }

  setEnabled(enabled) {
    this.manager.setEnabled(enabled);
  }

  destroy() {
    this.manager.destroy();
  }
}

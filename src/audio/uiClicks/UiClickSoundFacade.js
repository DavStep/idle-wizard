import { UiClickSoundManager } from './managers/UiClickSoundManager.js';

export class UiClickSoundFacade {
  static explain =
    'Plays the shared Root Run button, purchase, and dialog cues so interface actions feel confirmed.';

  constructor({ manager = new UiClickSoundManager() } = {}) {
    this.manager = manager;
  }

  playClick() {
    return this.manager.playClick();
  }

  playPurchase() {
    return this.manager.playPurchase();
  }

  playDialogOpen() {
    return this.manager.playDialogOpen();
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

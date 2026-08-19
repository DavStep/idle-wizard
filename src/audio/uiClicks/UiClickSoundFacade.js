import { UiClickSoundManager } from './managers/UiClickSoundManager.js';

export class UiClickSoundFacade {
  static explain =
    'Plays shared button, purchase, dialog, and summon cues so interface actions feel confirmed.';

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

  playSummon(quantity) {
    return this.manager.playSummon(quantity);
  }

  unlock() {
    this.manager.unlock();
  }

  setEnabled(enabled) {
    this.manager.setEnabled(enabled);
  }

  setVolume(volume) {
    this.manager.setVolume(volume);
  }

  destroy() {
    this.manager.destroy();
  }
}

import { BackgroundMusicManager } from './managers/BackgroundMusicManager.js';

export class BackgroundMusicFacade {
  static explain =
    'Plays the quiet looping room soundtrack and follows the device music preference without affecting gameplay.';

  constructor({ manager = new BackgroundMusicManager() } = {}) {
    this.manager = manager;
  }

  start() {
    return this.manager.start();
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

import { GardenSoundManager } from './managers/GardenSoundManager.js';

export class GardenSoundFacade {
  static explain =
    'Plays the Garden planting and harvest cues after those plot actions succeed, so tile feedback matches the action the player completed.';

  constructor({ manager = new GardenSoundManager() } = {}) {
    this.manager = manager;
  }

  playPlant() {
    return this.manager.playPlant();
  }

  playHarvest() {
    return this.manager.playHarvest();
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

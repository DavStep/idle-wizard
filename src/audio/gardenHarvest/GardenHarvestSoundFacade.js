import { GardenHarvestSoundManager } from './managers/GardenHarvestSoundManager.js';

export class GardenHarvestSoundFacade {
  static explain =
    'Plays a short crop-cut cue after a Garden plot accepts a manual harvest, so collecting feels immediate.';

  constructor({ manager = new GardenHarvestSoundManager() } = {}) {
    this.manager = manager;
  }

  playHarvest() {
    return this.manager.playHarvest();
  }

  setEnabled(enabled) {
    this.manager.setEnabled(enabled);
  }

  destroy() {
    this.manager.destroy();
  }
}

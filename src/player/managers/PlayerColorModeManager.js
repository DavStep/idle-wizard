import {
  getPlayerColorModeOptions,
  normalizePlayerColorMode,
} from '../playerColorModes.js';

export class PlayerColorModeManager {
  constructor({ storageManager }) {
    this.storageManager = storageManager;
    this.colorMode = normalizePlayerColorMode(this.storageManager.loadColorMode());
  }

  getColorMode() {
    return this.colorMode;
  }

  getColorModeOptions() {
    return getPlayerColorModeOptions();
  }

  setColorMode(colorMode) {
    this.colorMode = normalizePlayerColorMode(colorMode);
    this.storageManager.saveColorMode(this.colorMode);
    return this.colorMode;
  }
}

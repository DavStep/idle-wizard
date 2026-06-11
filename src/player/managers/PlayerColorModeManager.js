import {
  getPlayerColorModeOptions,
  normalizePlayerColorMode,
} from '../playerColorModes.js';

export class PlayerColorModeManager {
  constructor() {
    this.colorMode = normalizePlayerColorMode();
  }

  getColorMode() {
    return this.colorMode;
  }

  getColorModeOptions() {
    return getPlayerColorModeOptions();
  }

  setColorMode(colorMode) {
    this.colorMode = normalizePlayerColorMode(colorMode);
    return this.colorMode;
  }

  applyServerColorMode(colorMode) {
    this.colorMode = normalizePlayerColorMode(colorMode);
    return this.colorMode;
  }
}

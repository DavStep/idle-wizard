import {
  getPlayerIconModeOptions,
  normalizePlayerIconMode,
} from '../playerIconModes.js';

const ICON_MODE_STORAGE_KEY = 'idle-wizard.player.iconMode';

export class PlayerIconModeManager {
  constructor({ storage } = {}) {
    this.storage = storage ?? this.getDefaultStorage();
    this.iconMode = normalizePlayerIconMode(this.readStoredIconMode());
  }

  getIconMode() {
    return this.iconMode;
  }

  getIconModeOptions() {
    return getPlayerIconModeOptions();
  }

  setIconMode(iconMode) {
    this.iconMode = normalizePlayerIconMode(iconMode);
    this.writeStoredIconMode(this.iconMode);
    return this.iconMode;
  }

  applyServerIconMode(iconMode) {
    this.iconMode = normalizePlayerIconMode(iconMode);
    this.writeStoredIconMode(this.iconMode);
    return this.iconMode;
  }

  readStoredIconMode() {
    try {
      return this.storage?.getItem?.(ICON_MODE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  writeStoredIconMode(iconMode) {
    try {
      this.storage?.setItem?.(ICON_MODE_STORAGE_KEY, iconMode);
    } catch {
      // Local storage can be unavailable in embedded or private browser contexts.
    }
  }

  getDefaultStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

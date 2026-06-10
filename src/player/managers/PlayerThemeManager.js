import {
  getPlayerThemeOptions,
  normalizePlayerTheme,
} from '../playerThemes.js';

export class PlayerThemeManager {
  constructor({ storageManager }) {
    this.storageManager = storageManager;
    this.theme = normalizePlayerTheme(this.storageManager.loadTheme());
  }

  getTheme() {
    return this.theme;
  }

  getThemeOptions() {
    return getPlayerThemeOptions();
  }

  setTheme(theme) {
    this.theme = normalizePlayerTheme(theme);
    this.storageManager.saveTheme(this.theme);
    return this.theme;
  }
}

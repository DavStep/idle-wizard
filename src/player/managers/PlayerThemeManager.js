import {
  getPlayerThemeOptions,
  normalizePlayerTheme,
} from '../playerThemes.js';

export class PlayerThemeManager {
  constructor() {
    this.theme = normalizePlayerTheme();
  }

  getTheme() {
    return this.theme;
  }

  getThemeOptions() {
    return getPlayerThemeOptions();
  }

  setTheme(theme) {
    this.theme = normalizePlayerTheme(theme);
    return this.theme;
  }

  applyServerTheme(theme) {
    this.theme = normalizePlayerTheme(theme);
    return this.theme;
  }
}

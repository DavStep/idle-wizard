const THEME_KEY = 'idle-wizard.player.theme';

export class PlayerThemeStorageManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage ?? null;
  }

  loadTheme() {
    if (!this.storage) {
      return undefined;
    }

    try {
      return this.storage.getItem(THEME_KEY) || undefined;
    } catch {
      return undefined;
    }
  }

  saveTheme(theme) {
    if (!this.storage || !theme) {
      return;
    }

    try {
      this.storage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable in private browser modes.
    }
  }
}

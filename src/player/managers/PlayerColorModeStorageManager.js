const COLOR_MODE_KEY = 'idle-wizard.player.colorMode';

export class PlayerColorModeStorageManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage ?? null;
  }

  loadColorMode() {
    if (!this.storage) {
      return undefined;
    }

    try {
      return this.storage.getItem(COLOR_MODE_KEY) || undefined;
    } catch {
      return undefined;
    }
  }

  saveColorMode(colorMode) {
    if (!this.storage || !colorMode) {
      return;
    }

    try {
      this.storage.setItem(COLOR_MODE_KEY, colorMode);
    } catch {
      // Storage can be unavailable in private browser modes.
    }
  }
}

const USERNAME_KEY = 'idle-wizard.player.username';

export class PlayerNameStorageManager {
  constructor({ storage = globalThis.localStorage } = {}) {
    this.storage = storage ?? null;
  }

  loadUsername() {
    if (!this.storage) {
      return undefined;
    }

    try {
      return this.storage.getItem(USERNAME_KEY) || undefined;
    } catch {
      return undefined;
    }
  }

  saveUsername(username) {
    if (!this.storage || !username) {
      return;
    }

    try {
      this.storage.setItem(USERNAME_KEY, username);
    } catch {
      // Storage can be unavailable in private browser modes.
    }
  }
}

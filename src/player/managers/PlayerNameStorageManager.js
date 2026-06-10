const USERNAME_KEY = 'idle-wizard.player.username';
const USERNAME_PROMPT_SEEN_KEY = 'idle-wizard.player.usernamePromptSeen';

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

  loadUsernamePromptSeen() {
    if (!this.storage) {
      return false;
    }

    try {
      return this.storage.getItem(USERNAME_PROMPT_SEEN_KEY) === 'true';
    } catch {
      return false;
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

  saveUsernamePromptSeen() {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(USERNAME_PROMPT_SEEN_KEY, 'true');
    } catch {
      // Storage can be unavailable in private browser modes.
    }
  }
}

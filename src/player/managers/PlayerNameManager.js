const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;

export class PlayerNameManager {
  constructor({ storageManager }) {
    this.storageManager = storageManager;
    this.username = this.normalizeUsername(this.storageManager.loadUsername());
  }

  getUsername() {
    return this.username;
  }

  setUsername(username) {
    this.username = this.normalizeUsername(username);
    this.storageManager.saveUsername(this.username);
    return this.username;
  }

  normalizeUsername(username) {
    const value = String(username ?? '')
      .trim()
      .replace(/\s+/g, ' ');

    return (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);
  }
}

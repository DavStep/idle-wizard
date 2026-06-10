const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;

export class PlayerNameManager {
  constructor({ storageManager }) {
    this.storageManager = storageManager;
    const storedUsername = this.storageManager.loadUsername();
    this.username = this.normalizeUsername(storedUsername);
    this.hasExplicitUsername = this.isExplicitUsername(storedUsername);
    this.usernamePromptSeen = this.storageManager.loadUsernamePromptSeen();
    this.profileLoaded = false;
  }

  getUsername() {
    return this.username;
  }

  shouldPromptForUsername() {
    return this.profileLoaded && !this.hasExplicitUsername && !this.usernamePromptSeen;
  }

  setUsername(username) {
    this.username = this.normalizeUsername(username);
    this.hasExplicitUsername = true;
    this.usernamePromptSeen = true;
    this.storageManager.saveUsername(this.username);
    this.storageManager.saveUsernamePromptSeen();

    return this.username;
  }

  applyServerUsername(username) {
    this.profileLoaded = true;
    this.username = this.normalizeUsername(username);

    if (this.isExplicitUsername(username) && this.username !== DEFAULT_USERNAME) {
      this.hasExplicitUsername = true;
      this.usernamePromptSeen = true;
      this.storageManager.saveUsername(this.username);
      this.storageManager.saveUsernamePromptSeen();
    }

    return this.username;
  }

  markProfileLoaded() {
    this.profileLoaded = true;
  }

  markUsernamePromptSeen() {
    this.usernamePromptSeen = true;
    this.storageManager.saveUsernamePromptSeen();
  }

  normalizeUsername(username) {
    const value = String(username ?? '')
      .trim()
      .replace(/\s+/g, ' ');

    return (value || DEFAULT_USERNAME).slice(0, MAX_USERNAME_LENGTH);
  }

  isExplicitUsername(username) {
    return String(username ?? '').trim().length > 0;
  }
}

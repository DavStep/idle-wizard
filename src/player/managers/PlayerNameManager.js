const DEFAULT_USERNAME = 'wizard';
const MAX_USERNAME_LENGTH = 24;

export class PlayerNameManager {
  constructor() {
    this.username = DEFAULT_USERNAME;
    this.hasExplicitUsername = false;
    this.usernamePromptSeen = false;
    this.profileLoaded = false;
  }

  getUsername() {
    return this.username;
  }

  getHasExplicitUsername() {
    return this.hasExplicitUsername;
  }

  shouldPromptForUsername() {
    return this.profileLoaded && !this.hasExplicitUsername && !this.usernamePromptSeen;
  }

  setUsername(username) {
    this.username = this.normalizeUsername(username);
    this.hasExplicitUsername = true;
    this.usernamePromptSeen = true;

    return this.username;
  }

  applyServerUsername(username) {
    return this.applyServerProfile({ username });
  }

  applyServerProfile(profile = {}) {
    this.profileLoaded = true;
    const username = this.normalizeUsername(profile.username);
    const serverHasExplicitUsername =
      this.isExplicitUsername(profile.username) && username !== DEFAULT_USERNAME;
    const keepLocalExplicitUsername = this.hasExplicitUsername && this.username === username;
    this.username = username;
    this.hasExplicitUsername = keepLocalExplicitUsername || serverHasExplicitUsername;
    this.usernamePromptSeen =
      this.usernamePromptSeen || Boolean(profile.usernamePromptSeen) || this.hasExplicitUsername;

    return this.username;
  }

  markProfileLoaded() {
    this.profileLoaded = true;
  }

  markUsernamePromptSeen() {
    this.usernamePromptSeen = true;
  }

  getUsernamePromptSeen() {
    return this.usernamePromptSeen;
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

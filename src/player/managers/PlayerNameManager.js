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
    this.username = this.normalizeUsername(profile.username);
    this.hasExplicitUsername =
      this.isExplicitUsername(profile.username) && this.username !== DEFAULT_USERNAME;
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

import { PlayerColorModeManager } from './managers/PlayerColorModeManager.js';
import { PlayerFontManager } from './managers/PlayerFontManager.js';
import { PlayerIconModeManager } from './managers/PlayerIconModeManager.js';
import { PlayerNameManager } from './managers/PlayerNameManager.js';
import { PlayerStateObserverManager } from './managers/PlayerStateObserverManager.js';
import { PlayerThemeManager } from './managers/PlayerThemeManager.js';

export class PlayerFacade {
  static explain =
    'Keeps the player name shown in the room header, so the game can greet the right wizard.';

  constructor() {
    this.nameManager = new PlayerNameManager();
    this.themeManager = new PlayerThemeManager();
    this.fontManager = new PlayerFontManager();
    this.colorModeManager = new PlayerColorModeManager();
    this.iconModeManager = new PlayerIconModeManager();
    this.stateObserverManager = new PlayerStateObserverManager();
  }

  setUsername(username) {
    this.nameManager.setUsername(username);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  applyServerUsername(username) {
    this.nameManager.applyServerUsername(username);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  applyServerProfile(profile) {
    this.nameManager.applyServerProfile(profile);
    this.themeManager.applyServerTheme(profile?.theme);
    this.fontManager.applyServerFont(profile?.font);
    this.colorModeManager.applyServerColorMode(profile?.colorMode);
    if (Object.hasOwn(profile ?? {}, 'iconMode')) {
      this.iconModeManager.applyServerIconMode(profile.iconMode);
    }
    this.publishSnapshot();
    return this.getSnapshot();
  }

  markUsernameProfileLoaded() {
    this.nameManager.markProfileLoaded();
    this.publishSnapshot();
    return this.getSnapshot();
  }

  markUsernamePromptSeen() {
    this.nameManager.markUsernamePromptSeen();
    this.publishSnapshot();
    return this.getSnapshot();
  }

  setTheme(theme) {
    this.themeManager.setTheme(theme);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getThemeOptions() {
    return this.themeManager.getThemeOptions();
  }

  setFont(font) {
    this.fontManager.setFont(font);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getFontOptions() {
    return this.fontManager.getFontOptions();
  }

  setColorMode(colorMode) {
    this.colorModeManager.setColorMode(colorMode);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getColorModeOptions() {
    return this.colorModeManager.getColorModeOptions();
  }

  setIconMode(iconMode) {
    this.iconModeManager.setIconMode(iconMode);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getIconModeOptions() {
    return this.iconModeManager.getIconModeOptions();
  }

  getSnapshot() {
    return {
      username: this.nameManager.getUsername(),
      shouldPromptForUsername: this.nameManager.shouldPromptForUsername(),
      usernamePromptSeen: this.nameManager.getUsernamePromptSeen(),
      theme: this.themeManager.getTheme(),
      font: this.fontManager.getFont(),
      colorMode: this.colorModeManager.getColorMode(),
      iconMode: this.iconModeManager.getIconMode(),
    };
  }

  getProfileSnapshot() {
    const snapshot = this.getSnapshot();
    return {
      username: snapshot.username,
      usernamePromptSeen: snapshot.usernamePromptSeen,
      theme: snapshot.theme,
      font: snapshot.font,
      colorMode: snapshot.colorMode,
      iconMode: snapshot.iconMode,
    };
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}

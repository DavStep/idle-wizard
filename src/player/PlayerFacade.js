import { PlayerColorModeManager } from './managers/PlayerColorModeManager.js';
import { PlayerCharacterManager } from './managers/PlayerCharacterManager.js';
import { PlayerFontManager } from './managers/PlayerFontManager.js';
import { PlayerIconModeManager } from './managers/PlayerIconModeManager.js';
import { PlayerNameManager } from './managers/PlayerNameManager.js';
import { PlayerProgressBarManager } from './managers/PlayerProgressBarManager.js';
import { PlayerStateObserverManager } from './managers/PlayerStateObserverManager.js';
import { PlayerThemeManager } from './managers/PlayerThemeManager.js';

export class PlayerFacade {
  static explain =
    'Keeps the player profile choices shown in shared UI, so the game can identify the right wizard.';

  constructor() {
    this.nameManager = new PlayerNameManager();
    this.themeManager = new PlayerThemeManager();
    this.fontManager = new PlayerFontManager();
    this.colorModeManager = new PlayerColorModeManager();
    this.characterManager = new PlayerCharacterManager();
    this.iconModeManager = new PlayerIconModeManager();
    this.progressBarManager = new PlayerProgressBarManager();
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
    this.characterManager.applyServerCharacter(profile?.character);
    if (Object.hasOwn(profile ?? {}, 'iconMode')) {
      this.iconModeManager.applyServerIconMode(profile.iconMode);
    }
    if (Object.hasOwn(profile ?? {}, 'progressBar')) {
      this.progressBarManager.applyServerProgressBar(profile.progressBar);
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

  setCharacter(character) {
    this.characterManager.setCharacter(character);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getCharacterOptions() {
    return this.characterManager.getCharacterOptions();
  }

  setIconMode(iconMode) {
    this.iconModeManager.setIconMode(iconMode);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getIconModeOptions() {
    return this.iconModeManager.getIconModeOptions();
  }

  setProgressBar(progressBar) {
    this.progressBarManager.setProgressBar(progressBar);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getProgressBarOptions() {
    return this.progressBarManager.getProgressBarOptions();
  }

  getSnapshot() {
    return {
      username: this.nameManager.getUsername(),
      shouldPromptForUsername: this.nameManager.shouldPromptForUsername(),
      usernamePromptSeen: this.nameManager.getUsernamePromptSeen(),
      theme: this.themeManager.getTheme(),
      font: this.fontManager.getFont(),
      colorMode: this.colorModeManager.getColorMode(),
      character: this.characterManager.getCharacter(),
      iconMode: this.iconModeManager.getIconMode(),
      progressBar: this.progressBarManager.getProgressBar(),
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
      character: snapshot.character,
      iconMode: snapshot.iconMode,
      progressBar: snapshot.progressBar,
    };
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}

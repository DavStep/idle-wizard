import { PlayerColorModeManager } from './managers/PlayerColorModeManager.js';
import { PlayerColorModeStorageManager } from './managers/PlayerColorModeStorageManager.js';
import { PlayerNameManager } from './managers/PlayerNameManager.js';
import { PlayerNameStorageManager } from './managers/PlayerNameStorageManager.js';
import { PlayerStateObserverManager } from './managers/PlayerStateObserverManager.js';
import { PlayerThemeManager } from './managers/PlayerThemeManager.js';
import { PlayerThemeStorageManager } from './managers/PlayerThemeStorageManager.js';

export class PlayerFacade {
  static explain =
    'Keeps the player name shown in the room header, so the game can greet the right wizard.';

  constructor({ storage } = {}) {
    this.nameStorageManager = new PlayerNameStorageManager({ storage });
    this.nameManager = new PlayerNameManager({
      storageManager: this.nameStorageManager,
    });
    this.themeStorageManager = new PlayerThemeStorageManager({ storage });
    this.themeManager = new PlayerThemeManager({
      storageManager: this.themeStorageManager,
    });
    this.colorModeStorageManager = new PlayerColorModeStorageManager({ storage });
    this.colorModeManager = new PlayerColorModeManager({
      storageManager: this.colorModeStorageManager,
    });
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

  setColorMode(colorMode) {
    this.colorModeManager.setColorMode(colorMode);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getColorModeOptions() {
    return this.colorModeManager.getColorModeOptions();
  }

  getSnapshot() {
    return {
      username: this.nameManager.getUsername(),
      shouldPromptForUsername: this.nameManager.shouldPromptForUsername(),
      theme: this.themeManager.getTheme(),
      colorMode: this.colorModeManager.getColorMode(),
    };
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}

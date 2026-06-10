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
    this.stateObserverManager = new PlayerStateObserverManager();
  }

  setUsername(username) {
    this.nameManager.setUsername(username);
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

  getSnapshot() {
    return {
      username: this.nameManager.getUsername(),
      theme: this.themeManager.getTheme(),
    };
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}

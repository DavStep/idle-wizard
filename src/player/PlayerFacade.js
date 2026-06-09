import { PlayerNameManager } from './managers/PlayerNameManager.js';
import { PlayerNameStorageManager } from './managers/PlayerNameStorageManager.js';
import { PlayerStateObserverManager } from './managers/PlayerStateObserverManager.js';

export class PlayerFacade {
  static explain =
    'Keeps the player name shown in the room header, so the game can greet the right wizard.';

  constructor({ storage } = {}) {
    this.nameStorageManager = new PlayerNameStorageManager({ storage });
    this.nameManager = new PlayerNameManager({
      storageManager: this.nameStorageManager,
    });
    this.stateObserverManager = new PlayerStateObserverManager();
  }

  setUsername(username) {
    this.nameManager.setUsername(username);
    this.publishSnapshot();
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      username: this.nameManager.getUsername(),
    };
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  publishSnapshot() {
    this.stateObserverManager.publish(this.getSnapshot());
  }
}

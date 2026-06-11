import { PlayerBackendSyncManager } from './managers/PlayerBackendSyncManager.js';
import { PlayerLevelSyncManager } from './managers/PlayerLevelSyncManager.js';
import { PlayerProfileSubscriptionManager } from './managers/PlayerProfileSubscriptionManager.js';

export class PlayerBackendSyncFacade {
  static explain =
    'Loads and saves player profile details through the server so the same user keeps their shared name and level.';

  constructor() {
    this.syncManager = new PlayerBackendSyncManager();
    this.levelSyncManager = new PlayerLevelSyncManager();
    this.profileSubscriptionManager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => this.syncManager.applyServerProfile(profile),
    });
  }

  setPlayerFacade(playerFacade) {
    this.syncManager.setPlayerFacade(playerFacade);
  }

  setGameplayFacade(gameplayFacade) {
    this.levelSyncManager.setGameplayFacade(gameplayFacade);
  }

  setLevelSyncReady(ready) {
    this.levelSyncManager.setReadyToSync(ready);
  }

  discardPreHydrationPlayerLevel() {
    this.levelSyncManager.discardPreHydrationLevel();
  }

  markGameplaySaveHydrated() {
    this.levelSyncManager.markGameplaySaveHydrated();
  }

  connect(connection, identity) {
    this.syncManager.connect(connection);
    this.levelSyncManager.connect(connection);
    this.profileSubscriptionManager.connect(connection, identity);
  }

  disconnect() {
    this.profileSubscriptionManager.disconnect();
    this.levelSyncManager.disconnect();
    this.syncManager.disconnect();
  }
}

import { PlayerBackendSyncManager } from './managers/PlayerBackendSyncManager.js';
import { PlayerProfileSubscriptionManager } from './managers/PlayerProfileSubscriptionManager.js';

export class PlayerBackendSyncFacade {
  static explain =
    'Loads and saves the player name through the server so the same user keeps their profile.';

  constructor() {
    this.syncManager = new PlayerBackendSyncManager();
    this.profileSubscriptionManager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => this.syncManager.applyServerProfile(profile),
    });
  }

  setPlayerFacade(playerFacade) {
    this.syncManager.setPlayerFacade(playerFacade);
  }

  connect(connection, identity) {
    this.syncManager.connect(connection);
    this.profileSubscriptionManager.connect(connection, identity);
  }

  disconnect() {
    this.profileSubscriptionManager.disconnect();
    this.syncManager.disconnect();
  }
}

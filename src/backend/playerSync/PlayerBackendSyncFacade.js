import { PlayerBackendSyncManager } from './managers/PlayerBackendSyncManager.js';

export class PlayerBackendSyncFacade {
  static explain =
    'Sends the current player name to the server so shared tables can label this user.';

  constructor() {
    this.syncManager = new PlayerBackendSyncManager();
  }

  setPlayerFacade(playerFacade) {
    this.syncManager.setPlayerFacade(playerFacade);
  }

  connect(connection) {
    this.syncManager.connect(connection);
  }

  disconnect() {
    this.syncManager.disconnect();
  }
}

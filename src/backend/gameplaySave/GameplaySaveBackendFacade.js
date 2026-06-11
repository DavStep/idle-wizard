import { GameplaySaveSendManager } from './managers/GameplaySaveSendManager.js';
import { GameplaySaveSubscriptionManager } from './managers/GameplaySaveSubscriptionManager.js';

export class GameplaySaveBackendFacade {
  static explain =
    'Keeps the player progress save on the server, so auth identity is enough to restore play.';

  constructor() {
    this.sendManager = new GameplaySaveSendManager();
    this.subscriptionManager = new GameplaySaveSubscriptionManager();
  }

  connect(connection, identity, { onReady } = {}) {
    this.sendManager.connect(connection);
    return this.subscriptionManager.connect(connection, identity, { onReady });
  }

  disconnect() {
    this.subscriptionManager.disconnect();
    this.sendManager.disconnect();
  }

  load() {
    return this.subscriptionManager.getSnapshot().save;
  }

  save(save) {
    return this.sendManager.save(save);
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }
}

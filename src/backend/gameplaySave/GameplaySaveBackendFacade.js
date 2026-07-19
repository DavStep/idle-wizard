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
    this.sendManager.setReadyToSend(false);
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

  saveAndFlush(save) {
    return this.sendManager.saveAndFlush(save);
  }

  setSyncUnhealthyHandler(handler) {
    this.sendManager.setSyncUnhealthyHandler(handler);
  }

  discardPreHydrationSave() {
    this.sendManager.discardPreHydrationSave();
  }

  discardPendingSaves() {
    this.sendManager.discardPendingSaves();
  }

  getPendingHydratedSave() {
    return this.sendManager.getPendingHydratedSave();
  }

  discardHydratedSaveIfServerIsAtLeastAsNew(serverSave) {
    return this.sendManager.discardHydratedSaveIfServerIsAtLeastAsNew(serverSave);
  }

  setReadyToSend(ready = true) {
    this.sendManager.setReadyToSend(ready);
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }
}

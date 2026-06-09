import { WorldChatSendManager } from './managers/WorldChatSendManager.js';
import { WorldChatStateObserverManager } from './managers/WorldChatStateObserverManager.js';
import { WorldChatSubscriptionManager } from './managers/WorldChatSubscriptionManager.js';

export class WorldChatBackendFacade {
  static explain =
    'Shares short world chat messages through the server so players can talk in the same room.';

  constructor() {
    this.stateObserverManager = new WorldChatStateObserverManager();
    this.subscriptionManager = new WorldChatSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.sendManager = new WorldChatSendManager();
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
    this.sendManager.connect(connection);
  }

  disconnect() {
    this.sendManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  sendMessage(body) {
    return this.sendManager.sendMessage(body);
  }
}

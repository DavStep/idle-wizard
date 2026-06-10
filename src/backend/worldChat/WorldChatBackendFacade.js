import { WorldChatSendManager } from './managers/WorldChatSendManager.js';
import { WorldChatResearchAnnouncementManager } from './managers/WorldChatResearchAnnouncementManager.js';
import { WorldChatStateObserverManager } from './managers/WorldChatStateObserverManager.js';
import { WorldChatSubscriptionManager } from './managers/WorldChatSubscriptionManager.js';

export class WorldChatBackendFacade {
  static explain =
    'Shares short world chat messages and system notices through the server so players see the same room activity.';

  constructor() {
    this.stateObserverManager = new WorldChatStateObserverManager();
    this.subscriptionManager = new WorldChatSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.sendManager = new WorldChatSendManager();
    this.researchAnnouncementManager = new WorldChatResearchAnnouncementManager();
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
    this.sendManager.connect(connection);
    this.researchAnnouncementManager.connect(connection);
  }

  disconnect() {
    this.researchAnnouncementManager.disconnect();
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

  announceResearch(researchName) {
    return this.researchAnnouncementManager.announceResearch(researchName);
  }
}

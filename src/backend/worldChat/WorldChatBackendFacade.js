import { WorldChatSendManager } from './managers/WorldChatSendManager.js';
import { WorldChatLevelUpAnnouncementManager } from './managers/WorldChatLevelUpAnnouncementManager.js';
import { WorldChatPrestigeAnnouncementManager } from './managers/WorldChatPrestigeAnnouncementManager.js';
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
    this.levelUpAnnouncementManager = new WorldChatLevelUpAnnouncementManager();
    this.prestigeAnnouncementManager = new WorldChatPrestigeAnnouncementManager();
    this.researchAnnouncementManager = new WorldChatResearchAnnouncementManager();
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
    this.sendManager.connect(connection);
    this.levelUpAnnouncementManager.connect(connection);
    this.prestigeAnnouncementManager.connect(connection);
    this.researchAnnouncementManager.connect(connection);
  }

  disconnect() {
    this.researchAnnouncementManager.disconnect();
    this.prestigeAnnouncementManager.disconnect();
    this.levelUpAnnouncementManager.disconnect();
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

  announceLevelUp(playerLevel) {
    return this.levelUpAnnouncementManager.announceLevelUp(playerLevel);
  }

  announcePrestige(prestige) {
    return this.prestigeAnnouncementManager.announcePrestige(prestige);
  }
}

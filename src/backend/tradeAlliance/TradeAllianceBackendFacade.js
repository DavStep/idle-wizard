import { TradeAllianceActionManager } from './managers/TradeAllianceActionManager.js';
import { TradeAllianceRewardManager } from './managers/TradeAllianceRewardManager.js';
import { TradeAllianceStateObserverManager } from './managers/TradeAllianceStateObserverManager.js';
import { TradeAllianceSubscriptionManager } from './managers/TradeAllianceSubscriptionManager.js';

export class TradeAllianceBackendFacade {
  static explain =
    'Shares player trade groups, their chat, weekly goals, and crystal rewards through the server.';

  constructor() {
    this.stateObserverManager = new TradeAllianceStateObserverManager();
    this.actionManager = new TradeAllianceActionManager();
    this.rewardManager = new TradeAllianceRewardManager({
      actionManager: this.actionManager,
    });
    this.subscriptionManager = new TradeAllianceSubscriptionManager({
      onSnapshot: (snapshot) => {
        this.stateObserverManager.publish(snapshot);
        this.rewardManager.processSnapshot(snapshot);
      },
    });
    this.publicDataRetainCount = 0;
  }

  setGameplayFacade(gameplayFacade) {
    this.rewardManager.setGameplayFacade(gameplayFacade);
  }

  setRewardProcessingReady(ready) {
    this.rewardManager.setReady(ready);
  }

  connect(connection, identity) {
    this.actionManager.connect(connection);
    this.subscriptionManager.connect(connection, identity);
  }

  disconnect() {
    this.publicDataRetainCount = 0;
    this.rewardManager.disconnect();
    this.subscriptionManager.disconnect();
    this.actionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  retainPublicData() {
    this.publicDataRetainCount += 1;
    this.subscriptionManager.setPublicDataActive(true);

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.publicDataRetainCount = Math.max(0, this.publicDataRetainCount - 1);
      this.subscriptionManager.setPublicDataActive(this.publicDataRetainCount > 0);
    };
  }

  createAlliance(alliance) {
    return this.actionManager.createAlliance(alliance);
  }

  updateProfile(alliance) {
    return this.actionManager.updateProfile(alliance);
  }

  joinAlliance(allianceId) {
    return this.actionManager.joinAlliance(allianceId);
  }

  applyAlliance(allianceId) {
    return this.actionManager.applyAlliance(allianceId);
  }

  cancelApplication(applicationKey) {
    return this.actionManager.cancelApplication(applicationKey);
  }

  acceptApplication(applicationKey) {
    return this.actionManager.acceptApplication(applicationKey);
  }

  rejectApplication(applicationKey) {
    return this.actionManager.rejectApplication(applicationKey);
  }

  leaveAlliance() {
    return this.actionManager.leaveAlliance();
  }

  transferLeadership(memberIdentityHex) {
    return this.actionManager.transferLeadership(memberIdentityHex);
  }

  setMemberRole(memberIdentityHex, role) {
    return this.actionManager.setMemberRole(memberIdentityHex, role);
  }

  kickMember(memberIdentityHex) {
    return this.actionManager.kickMember(memberIdentityHex);
  }

  sendChatMessage(body) {
    return this.actionManager.sendChatMessage(body);
  }

  claimQuestReward(questId) {
    return this.actionManager.claimQuestReward(questId);
  }

  fillItemQuest(fill) {
    return this.actionManager.fillItemQuest(fill);
  }
}

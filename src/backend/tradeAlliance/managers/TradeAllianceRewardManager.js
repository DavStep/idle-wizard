export class TradeAllianceRewardManager {
  constructor({ actionManager } = {}) {
    this.actionManager = actionManager;
    this.gameplayFacade = null;
    this.ready = false;
    this.lastSnapshot = null;
    this.processingRewardKeys = new Set();
    this.appliedRewardKeys = new Set();
  }

  setGameplayFacade(gameplayFacade) {
    this.gameplayFacade = gameplayFacade;

    if (!gameplayFacade) {
      this.ready = false;
    }
  }

  setReady(ready) {
    this.ready = Boolean(ready);

    if (this.ready && this.lastSnapshot) {
      this.processSnapshot(this.lastSnapshot);
    }
  }

  disconnect() {
    this.ready = false;
    this.lastSnapshot = null;
    this.processingRewardKeys.clear();
  }

  processSnapshot(snapshot) {
    this.lastSnapshot = snapshot ?? null;

    if (!this.ready || !this.gameplayFacade || !snapshot?.connected) {
      return;
    }

    const rewardInbox = Array.isArray(snapshot.rewardInbox) ? snapshot.rewardInbox : [];

    for (const reward of rewardInbox) {
      const rewardKey = reward?.rewardKey;

      if (reward?.collected || !rewardKey || this.processingRewardKeys.has(rewardKey)) {
        continue;
      }

      this.processingRewardKeys.add(rewardKey);
      void this.applyReward(reward);
    }
  }

  async applyReward(reward) {
    if (this.appliedRewardKeys.has(reward.rewardKey)) {
      await this.actionManager?.collectReward?.(reward.rewardKey);
      this.processingRewardKeys.delete(reward.rewardKey);
      return;
    }

    const result = this.gameplayFacade.claimTradeAllianceCrystalReward?.(reward);

    if (result?.ok) {
      this.appliedRewardKeys.add(reward.rewardKey);
      await this.actionManager?.collectReward?.(reward.rewardKey);
    }

    this.processingRewardKeys.delete(reward.rewardKey);
  }
}

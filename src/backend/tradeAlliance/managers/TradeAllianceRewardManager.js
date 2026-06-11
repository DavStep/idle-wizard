export class TradeAllianceRewardManager {
  constructor({ actionManager } = {}) {
    this.actionManager = actionManager;
    this.gameplayFacade = null;
    this.processingRewardKeys = new Set();
    this.appliedRewardKeys = new Set();
  }

  setGameplayFacade(gameplayFacade) {
    this.gameplayFacade = gameplayFacade;
  }

  disconnect() {
    this.processingRewardKeys.clear();
  }

  processSnapshot(snapshot) {
    if (!this.gameplayFacade || !snapshot?.connected) {
      return;
    }

    const rewardInbox = Array.isArray(snapshot.rewardInbox) ? snapshot.rewardInbox : [];

    for (const reward of rewardInbox) {
      const rewardKey = reward?.rewardKey;

      if (!rewardKey || this.processingRewardKeys.has(rewardKey)) {
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

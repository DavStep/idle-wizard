export class WorldNoticeRewardManager {
  constructor({ goldFacade } = {}) {
    this.goldFacade = goldFacade;
  }

  grantReward(reward = {}) {
    const gold = Math.max(0, Math.floor(Number(reward.gold) || 0));

    if (gold > 0) {
      this.goldFacade?.add?.(gold);
    }

    return {
      gold,
    };
  }

  formatRewardText(reward = {}) {
    const gold = Math.max(0, Math.floor(Number(reward.gold) || 0));

    if (gold > 0) {
      return `+${gold} gold`;
    }

    return '';
  }
}

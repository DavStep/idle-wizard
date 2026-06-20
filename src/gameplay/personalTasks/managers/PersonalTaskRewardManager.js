export class PersonalTaskRewardManager {
  constructor({ crystalFacade, goldFacade } = {}) {
    this.crystalFacade = crystalFacade;
    this.goldFacade = goldFacade;
  }

  grantReward(reward = {}) {
    const gold = Math.max(0, Math.floor(Number(reward.gold) || 0));
    const crystal = Math.max(0, Math.floor(Number(reward.crystal) || 0));

    if (gold > 0) {
      this.goldFacade?.add?.(gold);
    }

    if (crystal > 0) {
      this.crystalFacade?.add?.(crystal);
    }

    return {
      gold,
      crystal,
    };
  }

  formatRewardText(reward = {}) {
    const parts = [];
    const gold = Math.max(0, Math.floor(Number(reward.gold) || 0));
    const crystal = Math.max(0, Math.floor(Number(reward.crystal) || 0));

    if (gold > 0) {
      parts.push(`+${gold} gold`);
    }

    if (crystal > 0) {
      parts.push(`+${crystal} crystal`);
    }

    return parts.join(', ');
  }
}

export class PersonalTaskRewardManager {
  constructor({ crystalFacade, coinFacade } = {}) {
    this.crystalFacade = crystalFacade;
    this.coinFacade = coinFacade;
  }

  grantReward(reward = {}) {
    const coin = Math.max(0, Math.floor(Number(reward.coin) || 0));
    const crystal = Math.max(0, Math.floor(Number(reward.crystal) || 0));

    if (coin > 0) {
      this.coinFacade?.add?.(coin);
    }

    if (crystal > 0) {
      this.crystalFacade?.add?.(crystal);
    }

    return {
      coin,
      crystal,
    };
  }

  formatRewardText(reward = {}) {
    const parts = [];
    const coin = Math.max(0, Math.floor(Number(reward.coin) || 0));
    const crystal = Math.max(0, Math.floor(Number(reward.crystal) || 0));

    if (coin > 0) {
      parts.push(`+${coin} coin`);
    }

    if (crystal > 0) {
      parts.push(`+${crystal} crystal`);
    }

    return parts.join(', ');
  }
}

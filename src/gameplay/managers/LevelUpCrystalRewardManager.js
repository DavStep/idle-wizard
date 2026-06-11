export class LevelUpCrystalRewardManager {
  constructor({ crystalFacade, playerLevelFacade }) {
    this.crystalFacade = crystalFacade;
    this.playerLevelFacade = playerLevelFacade;
  }

  grantForLevelRange(levelBefore, levelAfter) {
    const crystalReward = this.playerLevelFacade.getCrystalRewardForLevelRange(
      levelBefore,
      levelAfter,
    );

    if (crystalReward > 0) {
      this.crystalFacade.add(crystalReward);
    }

    return crystalReward;
  }
}

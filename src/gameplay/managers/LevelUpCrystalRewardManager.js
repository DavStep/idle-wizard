export class LevelUpCrystalRewardManager {
  constructor({
    crystalFacade,
    playerLevelFacade,
    getCommittedCrystalResearchCostTotal = () => 0,
  }) {
    this.crystalFacade = crystalFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.getCommittedCrystalResearchCostTotal = getCommittedCrystalResearchCostTotal;
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

  grantMissingForCurrentLevel() {
    const currentLevel = this.playerLevelFacade.getSnapshot().currentLevel ?? 1;
    const earnedCrystal = this.playerLevelFacade.getCrystalRewardForLevelRange(1, currentLevel);
    const spentCrystal = Math.max(
      0,
      Math.floor(Number(this.getCommittedCrystalResearchCostTotal()) || 0),
    );
    const minimumCurrentCrystal = Math.max(0, earnedCrystal - spentCrystal);
    const currentCrystal = Math.max(
      0,
      Math.floor(Number(this.crystalFacade.getSnapshot().current) || 0),
    );
    const missingCrystal = Math.max(0, minimumCurrentCrystal - currentCrystal);

    if (missingCrystal > 0) {
      this.crystalFacade.add(missingCrystal);
    }

    return missingCrystal;
  }
}

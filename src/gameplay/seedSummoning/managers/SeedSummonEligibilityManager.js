export class SeedSummonEligibilityManager {
  constructor({ itemsFacade, researchFacade }) {
    this.itemsFacade = itemsFacade;
    this.researchFacade = researchFacade;
  }

  getSummonableSeeds() {
    return this.itemsFacade.getSeedDefinitions().filter((seed) => this.canSummonSeed(seed));
  }

  canSummonSeed(seedDefinition) {
    return (
      this.researchFacade?.hasCompletedResearch(this.getSeedUnlockResearchId(seedDefinition)) ??
      false
    );
  }

  getSeedUnlockResearchId(seedDefinition) {
    return `unlockSeed:${seedDefinition.key}`;
  }
}

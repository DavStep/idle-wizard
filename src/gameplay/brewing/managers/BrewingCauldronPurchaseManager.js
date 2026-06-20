export class BrewingCauldronPurchaseManager {
  constructor({
    goldFacade,
    brewingBalanceManager,
    brewingCauldronEntityManager,
    playerLevelFacade,
    researchFacade,
  }) {
    this.goldFacade = goldFacade;
    this.brewingBalanceManager = brewingBalanceManager;
    this.brewingCauldronEntityManager = brewingCauldronEntityManager;
    this.playerLevelFacade = playerLevelFacade;
    this.researchFacade = researchFacade;
  }

  buyNextCauldron() {
    const nextCauldronNumber = this.brewingCauldronEntityManager.getUnlockedCauldrons() + 1;
    const cost = this.brewingBalanceManager.getCauldronCost(nextCauldronNumber);

    if (cost === null) {
      return {
        ok: false,
        reason: 'max_cauldrons',
      };
    }

    if (nextCauldronNumber > this.getMaxCauldronsByProgression()) {
      const requiredResearchId = this.getRequiredCapacityResearchId(nextCauldronNumber);

      if (requiredResearchId) {
        return {
          ok: false,
          reason: 'research_locked',
          requiredResearchId,
          cauldronNumber: nextCauldronNumber,
        };
      }

      return {
        ok: false,
        reason: 'level_locked',
        requiredLevel:
          this.playerLevelFacade?.getRequiredLevelForCauldron(nextCauldronNumber) ?? null,
        cauldronNumber: nextCauldronNumber,
      };
    }

    if (!this.goldFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        cost,
        cauldronNumber: nextCauldronNumber,
      };
    }

    this.brewingCauldronEntityManager.unlockNextCauldron();

    return {
      ok: true,
      cost,
      cauldronNumber: nextCauldronNumber,
    };
  }

  getMaxCauldronsByLevel() {
    return Math.min(
      this.brewingBalanceManager.getMaxCauldrons(),
      this.playerLevelFacade?.getMaxCauldrons?.() ?? this.brewingBalanceManager.getMaxCauldrons(),
    );
  }

  getMaxCauldronsByProgression() {
    const maxCauldronsByLevel = this.getMaxCauldronsByLevel();

    return Math.min(
      this.brewingBalanceManager.getMaxCauldrons(),
      this.researchFacade?.getMaxCauldronsWithCapacity?.(maxCauldronsByLevel) ??
        maxCauldronsByLevel,
    );
  }

  getRequiredCapacityResearchId(cauldronNumber) {
    return this.researchFacade?.getRequiredCauldronCapacityResearchId?.(cauldronNumber) ?? null;
  }
}

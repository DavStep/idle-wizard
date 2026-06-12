import { automationResearchIds } from '../automationResearchIds.js';

export class SeedSummoningAutomationManager {
  constructor({ brewingFacade, gameplayLogFacade, researchFacade, seedSummoningFacade } = {}) {
    this.brewingFacade = brewingFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.researchFacade = researchFacade;
    this.seedSummoningFacade = seedSummoningFacade;
  }

  update() {
    if (!this.hasResearch(automationResearchIds.autoSeedSpawn())) {
      return;
    }

    const reservedMana = this.getReservedManaForAutoBrew();

    if (!this.seedSummoningFacade?.canSummonSeed({ reservedMana })) {
      return;
    }

    const result = this.seedSummoningFacade.summonSeed();

    if (result.ok) {
      this.gameplayLogFacade?.logSeedSummoned(result);
    }
  }

  hasResearch(researchId) {
    return this.researchFacade?.hasCompletedResearch(researchId) === true;
  }

  getReservedManaForAutoBrew() {
    const cauldronNumber = this.brewingFacade?.getSnapshot?.().cauldronNumber ?? 1;

    if (!this.hasResearch(automationResearchIds.autoBrewCauldron(cauldronNumber))) {
      return 0;
    }

    const pendingCost = this.brewingFacade?.getPendingAutoBrewManaCost?.() ?? 0;

    return Number.isFinite(pendingCost) ? Math.max(0, pendingCost) : 0;
  }
}

import { automationResearchIds } from '../automationResearchIds.js';

export class SeedSummoningAutomationManager {
  constructor({ gameplayLogFacade, researchFacade, seedSummoningFacade } = {}) {
    this.gameplayLogFacade = gameplayLogFacade;
    this.researchFacade = researchFacade;
    this.seedSummoningFacade = seedSummoningFacade;
  }

  update() {
    if (!this.hasResearch(automationResearchIds.autoSeedSpawn())) {
      return;
    }

    if (!this.seedSummoningFacade?.getSnapshot().canSummon) {
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
}

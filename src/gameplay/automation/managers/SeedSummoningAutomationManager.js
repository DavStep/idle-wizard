import { automationResearchIds } from '../automationResearchIds.js';

export class SeedSummoningAutomationManager {
  constructor({
    brewingFacade,
    gameplayLogFacade,
    onSeedSummoned,
    researchFacade,
    seedSummoningFacade,
    seedSummoningSettingsManager,
  } = {}) {
    this.brewingFacade = brewingFacade;
    this.gameplayLogFacade = gameplayLogFacade;
    this.onSeedSummoned = onSeedSummoned;
    this.researchFacade = researchFacade;
    this.seedSummoningFacade = seedSummoningFacade;
    this.seedSummoningSettingsManager = seedSummoningSettingsManager;
  }

  update() {
    if (!this.hasResearch(automationResearchIds.autoSeedSpawn())) {
      return;
    }

    if (this.seedSummoningSettingsManager?.isEnabled?.() === false) {
      return;
    }

    const reservedMana = Math.max(
      this.getReservedManaForAutoBrew(),
      this.seedSummoningSettingsManager?.getManaReserve?.() ?? 0,
    );

    if (!this.seedSummoningFacade?.canSummonSeed({ reservedMana })) {
      return;
    }

    const result = this.seedSummoningFacade.summonSeed();

    if (result.ok) {
      if (this.onSeedSummoned) {
        this.onSeedSummoned(result);
      } else {
        this.gameplayLogFacade?.logSeedSummoned(result);
      }
    }
  }

  hasResearch(researchId) {
    return this.researchFacade?.hasCompletedResearch(researchId) === true;
  }

  getReservedManaForAutoBrew() {
    if (!this.hasAnyAutoBrewResearch()) {
      return 0;
    }

    const cauldronNumber = this.brewingFacade?.getSnapshot?.().cauldronNumber ?? 1;

    if (!this.hasResearch(automationResearchIds.autoBrewCauldron(cauldronNumber))) {
      return 0;
    }

    const pendingCost = this.brewingFacade?.getPendingAutoBrewManaCost?.() ?? 0;

    return Number.isFinite(pendingCost) ? Math.max(0, pendingCost) : 0;
  }

  hasAnyAutoBrewResearch() {
    return (
      this.researchFacade?.hasCompletedResearchMatching?.(
        (researchId) =>
          typeof researchId === 'string' &&
          researchId.startsWith('automation:autoBrewCauldron:'),
      ) === true
    );
  }
}

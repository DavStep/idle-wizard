import { BrewingAutomationManager } from './managers/BrewingAutomationManager.js';
import { GardenAutomationManager } from './managers/GardenAutomationManager.js';
import { SeedSummoningAutomationManager } from './managers/SeedSummoningAutomationManager.js';
import { SeedSummoningAutomationSettingsManager } from './managers/SeedSummoningAutomationSettingsManager.js';
import { automationResearchIds } from './automationResearchIds.js';

export class AutomationFacade {
  static explain =
    'Automation lets advanced research turn repeated seed, garden, and cauldron taps into rules that run each game tick.';

  constructor({
    brewingFacade,
    gardenFacade,
    gameplayLogFacade,
    onSeedSummoned,
    onPotionRecipeDiscovery,
    researchFacade,
    seedSummoningFacade,
  } = {}) {
    this.seedSummoningSettingsManager = new SeedSummoningAutomationSettingsManager();
    this.seedSummoningAutomationManager = new SeedSummoningAutomationManager({
      brewingFacade,
      gameplayLogFacade,
      onSeedSummoned,
      researchFacade,
      seedSummoningFacade,
      seedSummoningSettingsManager: this.seedSummoningSettingsManager,
    });
    this.gardenAutomationManager = new GardenAutomationManager({
      gardenFacade,
      gameplayLogFacade,
      researchFacade,
    });
    this.brewingAutomationManager = new BrewingAutomationManager({
      brewingFacade,
      onPotionRecipeDiscovery,
      researchFacade,
    });
    this.registered = false;
    this.researchFacade = researchFacade;
  }

  initialize(ecsManagers) {
    if (this.registered) {
      return;
    }

    ecsManagers.systems.register({
      update: () => this.update(),
    });
    this.registered = true;
  }

  update() {
    this.brewingAutomationManager.update();
    this.seedSummoningAutomationManager.update();
    this.gardenAutomationManager.update();
  }

  setSeedSummoningEnabled(enabled) {
    return this.seedSummoningSettingsManager.setEnabled(enabled);
  }

  toggleSeedSummoningEnabled() {
    return this.seedSummoningSettingsManager.toggleEnabled();
  }

  setSeedSummoningManaReserve(manaReserve) {
    return this.seedSummoningSettingsManager.setManaReserve(manaReserve);
  }

  getSnapshot() {
    return {
      seedSummoning: this.seedSummoningSettingsManager.getSnapshot({
        unlocked: this.hasSeedSummoningResearch(),
      }),
    };
  }

  getPersistenceSnapshot() {
    return this.seedSummoningSettingsManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.seedSummoningSettingsManager.applyPersistenceSnapshot(snapshot);
  }

  hasSeedSummoningResearch() {
    return (
      this.researchFacade?.hasCompletedResearch?.(automationResearchIds.autoSeedSpawn()) ===
      true
    );
  }
}

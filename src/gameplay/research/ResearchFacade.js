import { ResearchDefinitionManager } from './managers/ResearchDefinitionManager.js';
import { ResearchBalanceManager } from './managers/ResearchBalanceManager.js';
import { ResearchManaEffectManager } from './managers/ResearchManaEffectManager.js';
import { ResearchProcessManager } from './managers/ResearchProcessManager.js';
import { ResearchPurchaseManager } from './managers/ResearchPurchaseManager.js';
import { ResearchSnapshotManager } from './managers/ResearchSnapshotManager.js';
import { ResearchStateEntityManager } from './managers/ResearchStateEntityManager.js';
import {
  advancedResearchIds,
  advancedResearchMaxLevel,
  applyAdvancedResearchTimeReduction,
} from './advancedResearchIds.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class ResearchFacade {
  static explain =
    'Research lets the wizard spend gold, crystal, or ruby on studies that unlock seeds, recipes, automation, and speed upgrades.';

  constructor({
    crystalFacade,
    goldFacade,
    itemsFacade,
    manaFacade,
    onResearchComplete,
    playerLevelFacade,
    rubyFacade,
  }) {
    this.researchBalanceManager = new ResearchBalanceManager();
    this.researchDefinitionManager = new ResearchDefinitionManager({
      itemsFacade,
      playerLevelFacade,
      researchBalanceManager: this.researchBalanceManager,
    });
    this.researchStateEntityManager = new ResearchStateEntityManager({
      researchDefinitionManager: this.researchDefinitionManager,
    });
    this.researchManaEffectManager = new ResearchManaEffectManager({
      manaFacade,
      researchBalanceManager: this.researchBalanceManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.researchPurchaseManager = new ResearchPurchaseManager({
      crystalFacade,
      goldFacade,
      rubyFacade,
      researchBalanceManager: this.researchBalanceManager,
      researchDefinitionManager: this.researchDefinitionManager,
      researchManaEffectManager: this.researchManaEffectManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.researchProcessManager = new ResearchProcessManager({
      onResearchComplete,
      researchDefinitionManager: this.researchDefinitionManager,
      researchManaEffectManager: this.researchManaEffectManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.researchSnapshotManager = new ResearchSnapshotManager({
      crystalFacade,
      goldFacade,
      rubyFacade,
      researchBalanceManager: this.researchBalanceManager,
      researchDefinitionManager: this.researchDefinitionManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.initialized = false;
  }

  initialize(ecsManagers) {
    this.researchStateEntityManager.initialize(ecsManagers);
    this.researchProcessManager.register(ecsManagers.systems);
    this.initialized = true;
  }

  applyRuntimeConfig(snapshot = {}) {
    const balance = parseGameConfig(snapshot, 'research');

    if (balance) {
      try {
        this.researchBalanceManager.setRuntimeBalance(balance);
      } catch {
        return;
      }
    }

    this.researchBalanceManager.setRuntimeConfigs(snapshot?.researchConfigs);

    if (this.initialized) {
      this.researchManaEffectManager.syncCompletedEffects();
    }
  }

  buyResearch(researchId) {
    return this.researchPurchaseManager.buyResearch(researchId);
  }

  hasCompletedResearch(researchId) {
    return this.researchStateEntityManager.isCompleted(researchId);
  }

  getResearchLabel(researchId) {
    return this.researchDefinitionManager.getResearch(researchId)?.label ?? researchId;
  }

  getCompletedCrystalCostTotal() {
    return this.researchStateEntityManager
      .getCompletedResearchIds()
      .reduce(
        (total, researchId) => total + this.researchBalanceManager.getCostCrystal(researchId),
        0,
      );
  }

  getCompletedCauldronBrewingLevel(cauldronNumber) {
    return this.getCompletedAdvancedLevel({
      getId: advancedResearchIds.cauldronBrewing,
      targetNumber: cauldronNumber,
    });
  }

  getReducedCauldronBrewingDurationMs(cauldronNumber, durationMs) {
    return applyAdvancedResearchTimeReduction(
      durationMs,
      this.getCompletedCauldronBrewingLevel(cauldronNumber),
    );
  }

  getCompletedPlotGrowthLevel(plotNumber) {
    return this.getCompletedAdvancedLevel({
      getId: advancedResearchIds.plotGrowth,
      targetNumber: plotNumber,
    });
  }

  getReducedPlotGrowthDurationMs(plotNumber, durationMs) {
    return applyAdvancedResearchTimeReduction(
      durationMs,
      this.getCompletedPlotGrowthLevel(plotNumber),
    );
  }

  getCompletedAdvancedLevel({ getId, targetNumber }) {
    let completedLevel = 0;

    for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
      if (!this.researchStateEntityManager.isCompleted(getId(targetNumber, level))) {
        break;
      }

      completedLevel = level;
    }

    return completedLevel;
  }

  getSnapshot() {
    return this.researchSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return {
      completedIds: this.researchStateEntityManager.getCompletedResearchIds(),
      inProgress: this.researchStateEntityManager.getInProgressResearches(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    if (Array.isArray(snapshot.completedIds)) {
      this.researchStateEntityManager.setCompletedResearchIds(
        snapshot.completedIds.filter((researchId) => typeof researchId === 'string'),
      );
    }

    if (Array.isArray(snapshot.inProgress)) {
      this.researchStateEntityManager.setInProgressResearches(snapshot.inProgress);
    }

    this.researchManaEffectManager.syncCompletedEffects();
  }
}

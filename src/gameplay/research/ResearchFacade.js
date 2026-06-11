import { ResearchDefinitionManager } from './managers/ResearchDefinitionManager.js';
import { ResearchBalanceManager } from './managers/ResearchBalanceManager.js';
import { ResearchManaEffectManager } from './managers/ResearchManaEffectManager.js';
import { ResearchPurchaseManager } from './managers/ResearchPurchaseManager.js';
import { ResearchSnapshotManager } from './managers/ResearchSnapshotManager.js';
import { ResearchStateEntityManager } from './managers/ResearchStateEntityManager.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class ResearchFacade {
  static explain =
    'Research lets the wizard spend gold or crystal on studies that unlock seeds, recipes, and automation.';

  constructor({ crystalFacade, goldFacade, itemsFacade, manaFacade }) {
    this.researchBalanceManager = new ResearchBalanceManager();
    this.researchDefinitionManager = new ResearchDefinitionManager({
      itemsFacade,
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
      researchBalanceManager: this.researchBalanceManager,
      researchDefinitionManager: this.researchDefinitionManager,
      researchManaEffectManager: this.researchManaEffectManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.researchSnapshotManager = new ResearchSnapshotManager({
      crystalFacade,
      goldFacade,
      researchBalanceManager: this.researchBalanceManager,
      researchDefinitionManager: this.researchDefinitionManager,
      researchStateEntityManager: this.researchStateEntityManager,
    });
    this.initialized = false;
  }

  initialize(ecsManagers) {
    this.researchStateEntityManager.initialize(ecsManagers);
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

  getSnapshot() {
    return this.researchSnapshotManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return {
      completedIds: this.researchStateEntityManager.getCompletedResearchIds(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (!Array.isArray(snapshot.completedIds)) {
      return;
    }

    this.researchStateEntityManager.setCompletedResearchIds(
      snapshot.completedIds.filter((researchId) => typeof researchId === 'string'),
    );
    this.researchManaEffectManager.syncCompletedEffects();
  }
}

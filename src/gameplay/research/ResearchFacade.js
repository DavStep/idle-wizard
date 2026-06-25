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
import {
  fastSellResearchIds,
  fastSellResearchMaxLevel,
  getFastSellPercent as getFastSellPercentForLevel,
} from './fastSellResearch.js';
import {
  getResearchTimeReductionPercent as getResearchTimeReductionPercentForLevel,
  researchTimeResearchIds,
  researchTimeResearchMaxLevel,
} from './researchTimeResearch.js';
import {
  getResearchCostReductionPercent as getResearchCostReductionPercentForLevel,
  researchCostResearchIds,
  researchCostResearchMaxLevel,
} from './researchCostResearch.js';
import {
  emeraldResearchIds,
  emeraldResearchMaxMultiplier,
  emeraldResearchMinMultiplier,
} from './emeraldResearchIds.js';
import {
  capacityResearchIds,
  cauldronCapacityEndCauldronNumber,
  cauldronCapacityStartCauldronNumber,
  isCapacityResearchId,
  plotCapacityEndPlotNumber,
  plotCapacityStartPlotNumber,
} from './capacityResearchIds.js';
import { parseGameConfig } from '../config/gameConfigSnapshot.js';

export class ResearchFacade {
  static explain =
    'Research lets the wizard spend coin, crystal, ruby, or emerald on studies that unlock seeds, recipes, automation, and speed upgrades.';

  constructor({
    crystalFacade,
    emeraldFacade,
    coinFacade,
    itemsFacade,
    manaFacade,
    onResearchComplete,
    playerLevelFacade,
    prestigeFacade,
    rubyFacade,
  }) {
    this.researchBalanceManager = new ResearchBalanceManager();
    this.researchDefinitionManager = new ResearchDefinitionManager({
      itemsFacade,
      playerLevelFacade,
      prestigeFacade,
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
      emeraldFacade,
      coinFacade,
      getResearchCostReductionLevel: () => this.getCompletedResearchCostReductionLevel(),
      getResearchTimeReductionLevel: () => this.getCompletedResearchTimeReductionLevel(),
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
      emeraldFacade,
      coinFacade,
      rubyFacade,
      getResearchCostReductionLevel: () => this.getCompletedResearchCostReductionLevel(),
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
    this.researchDefinitionManager.clearCache();
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

  hasCompletedResearchMatching(predicate) {
    if (typeof predicate !== 'function') {
      return false;
    }

    return this.researchStateEntityManager.getCompletedResearchIds().some(predicate);
  }

  getResearchLabel(researchId) {
    return this.researchDefinitionManager.getResearch(researchId)?.label ?? researchId;
  }

  getResearchActionType(researchId) {
    return this.researchDefinitionManager.getResearch(researchId)?.actionType ?? 'research';
  }

  getCompletedCrystalCostTotal() {
    return this.researchStateEntityManager
      .getCompletedResearchIds()
      .reduce(
        (total, researchId) => total + this.researchBalanceManager.getCostCrystal(researchId),
        0,
      );
  }

  getCommittedCrystalCostTotal() {
    const researchIds = new Set([
      ...this.researchStateEntityManager.getCompletedResearchIds(),
      ...this.researchStateEntityManager
        .getInProgressResearches()
        .map((research) => research.researchId),
    ]);

    return [...researchIds].reduce(
      (total, researchId) => total + this.researchBalanceManager.getCostCrystal(researchId),
      0,
    );
  }

  getCompletedRubyCostTotal() {
    return this.researchStateEntityManager
      .getCompletedResearchIds()
      .reduce(
        (total, researchId) => total + this.researchBalanceManager.getCostRuby(researchId),
        0,
      );
  }

  getCommittedRubyCostTotal() {
    const researchIds = new Set([
      ...this.researchStateEntityManager.getCompletedResearchIds(),
      ...this.researchStateEntityManager
        .getInProgressResearches()
        .map((research) => research.researchId),
    ]);

    return [...researchIds].reduce(
      (total, researchId) => total + this.researchBalanceManager.getCostRuby(researchId),
      0,
    );
  }

  getCommittedEmeraldCostTotal() {
    const researchIds = new Set([
      ...this.researchStateEntityManager.getCompletedResearchIds(),
      ...this.researchStateEntityManager
        .getInProgressResearches()
        .map((research) => research.researchId),
    ]);

    return [...researchIds].reduce(
      (total, researchId) => total + this.researchBalanceManager.getCostEmerald(researchId),
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

  getCompletedPlotCapacityBonus() {
    return this.getCompletedCapacityBonus({
      start: plotCapacityStartPlotNumber,
      end: plotCapacityEndPlotNumber,
      getId: capacityResearchIds.plot,
    });
  }

  getMaxGardenTilesWithCapacity(baseMaxGardenTiles) {
    return this.getMaxCapacityWithBonus({
      baseMax: baseMaxGardenTiles,
      baseCapacity: plotCapacityStartPlotNumber - 1,
      bonus: this.getCompletedPlotCapacityBonus(),
    });
  }

  getRequiredGardenCapacityResearchId(tileNumber) {
    return this.getRequiredCapacityResearchId({
      targetNumber: tileNumber,
      start: plotCapacityStartPlotNumber,
      end: plotCapacityEndPlotNumber,
      getId: capacityResearchIds.plot,
    });
  }

  getCompletedCauldronCapacityBonus() {
    return this.getCompletedCapacityBonus({
      start: cauldronCapacityStartCauldronNumber,
      end: cauldronCapacityEndCauldronNumber,
      getId: capacityResearchIds.cauldron,
    });
  }

  getMaxCauldronsWithCapacity(baseMaxCauldrons) {
    return this.getMaxCapacityWithBonus({
      baseMax: baseMaxCauldrons,
      baseCapacity: cauldronCapacityStartCauldronNumber - 1,
      bonus: this.getCompletedCauldronCapacityBonus(),
    });
  }

  getRequiredCauldronCapacityResearchId(cauldronNumber) {
    return this.getRequiredCapacityResearchId({
      targetNumber: cauldronNumber,
      start: cauldronCapacityStartCauldronNumber,
      end: cauldronCapacityEndCauldronNumber,
      getId: capacityResearchIds.cauldron,
    });
  }

  getReducedPlotGrowthDurationMs(plotNumber, durationMs) {
    return applyAdvancedResearchTimeReduction(
      durationMs,
      this.getCompletedPlotGrowthLevel(plotNumber),
    );
  }

  getPlotPlantingMultiplier(plotNumber) {
    return this.getCompletedEmeraldMultiplier({
      getId: emeraldResearchIds.plotPlanting,
      targetNumber: plotNumber,
    });
  }

  getCauldronBrewingMultiplier(cauldronNumber) {
    return this.getCompletedEmeraldMultiplier({
      getId: emeraldResearchIds.cauldronBrewing,
      targetNumber: cauldronNumber,
    });
  }

  getCompletedEmeraldMultiplier({ getId, targetNumber }) {
    let completedMultiplier = 1;

    for (
      let multiplier = emeraldResearchMinMultiplier;
      multiplier <= emeraldResearchMaxMultiplier;
      multiplier += 1
    ) {
      const researchId = getId(targetNumber, multiplier);
      if (!this.researchDefinitionManager.hasConfiguredResearch(researchId)) {
        break;
      }

      if (!this.researchStateEntityManager.isCompleted(researchId)) {
        break;
      }

      completedMultiplier = multiplier;
    }

    return completedMultiplier;
  }

  getFastSellPercent() {
    return getFastSellPercentForLevel(this.getCompletedFastSellLevel());
  }

  getResearchTimeReductionPercent() {
    return getResearchTimeReductionPercentForLevel(
      this.getCompletedResearchTimeReductionLevel(),
    );
  }

  getResearchCostReductionPercent() {
    return getResearchCostReductionPercentForLevel(
      this.getCompletedResearchCostReductionLevel(),
    );
  }

  getCompletedResearchCostReductionLevel() {
    let completedLevel = 0;

    for (let level = 1; level <= researchCostResearchMaxLevel; level += 1) {
      if (!this.researchStateEntityManager.isCompleted(researchCostResearchIds.reduction(level))) {
        break;
      }

      completedLevel = level;
    }

    return completedLevel;
  }

  getCompletedResearchTimeReductionLevel() {
    let completedLevel = 0;

    for (let level = 1; level <= researchTimeResearchMaxLevel; level += 1) {
      if (!this.researchStateEntityManager.isCompleted(researchTimeResearchIds.reduction(level))) {
        break;
      }

      completedLevel = level;
    }

    return completedLevel;
  }

  getCompletedFastSellLevel() {
    let completedLevel = 0;

    for (let level = 1; level <= fastSellResearchMaxLevel; level += 1) {
      if (!this.researchStateEntityManager.isCompleted(fastSellResearchIds.payout(level))) {
        break;
      }

      completedLevel = level;
    }

    return completedLevel;
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

  getCompletedCapacityBonus({ start, end, getId }) {
    let completed = 0;

    for (let targetNumber = start; targetNumber <= end; targetNumber += 1) {
      if (!this.researchStateEntityManager.isCompleted(getId(targetNumber))) {
        break;
      }

      completed += 1;
    }

    return completed;
  }

  getMaxCapacityWithBonus({ baseMax, baseCapacity, bonus }) {
    const safeBaseMax = Math.max(0, Math.floor(Number(baseMax) || 0));
    const safeBonus = Math.max(0, Math.floor(Number(bonus) || 0));

    if (safeBonus <= 0) {
      return safeBaseMax;
    }

    return Math.max(safeBaseMax, baseCapacity + safeBonus);
  }

  getRequiredCapacityResearchId({ targetNumber, start, end, getId }) {
    const safeTargetNumber = Math.floor(Number(targetNumber));

    if (
      !Number.isInteger(safeTargetNumber) ||
      safeTargetNumber < start ||
      safeTargetNumber > end
    ) {
      return null;
    }

    return getId(safeTargetNumber);
  }

  getSnapshot() {
    return this.researchSnapshotManager.getSnapshot();
  }

  hasFrameTimerWork() {
    return this.researchStateEntityManager.hasInProgressResearches();
  }

  getPersistenceSnapshot() {
    return {
      completedIds: this.researchStateEntityManager.getCompletedResearchIds(),
      inProgress: this.researchStateEntityManager.getInProgressResearches(),
    };
  }

  getPermanentCompletedResearchIds() {
    return this.researchStateEntityManager
      .getCompletedResearchIds()
      .filter((researchId) => isCapacityResearchId(researchId));
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

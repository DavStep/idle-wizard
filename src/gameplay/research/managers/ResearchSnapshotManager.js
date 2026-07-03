import { formatEmeraldResearchStarLevel } from '../emeraldResearchIds.js';

export class ResearchSnapshotManager {
  constructor({
    crystalFacade,
    emeraldFacade,
    coinFacade,
    rubyFacade,
    getResearchCostReductionLevel,
    researchBalanceManager,
    researchDefinitionManager,
    researchSlotManager,
    researchStateEntityManager,
  }) {
    this.crystalFacade = crystalFacade;
    this.emeraldFacade = emeraldFacade;
    this.coinFacade = coinFacade;
    this.rubyFacade = rubyFacade;
    this.getResearchCostReductionLevel = getResearchCostReductionLevel;
    this.researchBalanceManager = researchBalanceManager;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchSlotManager = researchSlotManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  getSnapshot() {
    const completedResearchIds = this.researchStateEntityManager.getCompletedResearchIds();
    const tabs = this.researchDefinitionManager
      .getVisibleResearchTabs(completedResearchIds)
      .map((tab) => ({
        ...tab,
        boxes: tab.boxes.map((box) => this.getBoxSnapshot(box, completedResearchIds)),
      }));

    return {
      tabs,
      boxes: tabs[0]?.boxes ?? [],
      completedResearchIds,
      inProgressResearches: this.researchStateEntityManager.getInProgressResearches(),
      slots: this.researchSlotManager?.getSnapshot?.() ?? { active: 0, max: 1, full: false },
    };
  }

  getResearchSnapshotById(researchId) {
    const research = this.researchDefinitionManager.getConfiguredResearch(researchId);

    if (!research) {
      return null;
    }

    return this.getResearchSnapshot(research);
  }

  getBoxSnapshot(box, completedResearchIds = []) {
    return {
      ...box,
      researches: box.researches.map((research) =>
        this.getResearchSnapshot(research, completedResearchIds),
      ),
    };
  }

  getResearchSnapshot(research, completedResearchIds = []) {
    const researchOptions = { completedResearchIds };
    const cost = this.getResearchCost(research.id);
    const durationSeconds = this.researchBalanceManager.getDurationSeconds(research.id);
    const completed = this.researchStateEntityManager.isCompleted(research.id);
    const progress = this.researchStateEntityManager.getProgressSnapshot(research.id);
    const requiredResearchIds =
      research.requiredResearchIds ??
      this.researchDefinitionManager.getRequiredResearchIds(research.id, researchOptions);
    const hasRequiredResearch = requiredResearchIds.every((requiredResearchId) =>
      this.researchStateEntityManager.isCompleted(requiredResearchId),
    );
    const missingRequiredPlayerLevel =
      this.researchDefinitionManager.getMissingRequiredPlayerLevel(
        research.id,
        researchOptions,
      );
    const hasRequiredPlayerLevel = !missingRequiredPlayerLevel;
    const missingRequiredPrestigeCount =
      this.researchDefinitionManager.getMissingRequiredPrestigeCount(
        research.id,
        researchOptions,
      );
    const hasRequiredPrestigeCount = !missingRequiredPrestigeCount;
    const locked =
      !completed &&
      !progress.inProgress &&
      (!hasRequiredResearch || !hasRequiredPlayerLevel || !hasRequiredPrestigeCount);
    const slotsFull =
      !completed &&
      !progress.inProgress &&
      !locked &&
      durationSeconds > 0 &&
      this.researchSlotManager?.canStartTimedResearch?.() === false;

    return {
      ...research,
      effect: research.value,
      value: this.formatResearchValue({
        research,
        completed,
        hasRequiredResearch,
        hasRequiredPlayerLevel,
        hasRequiredPrestigeCount,
        cost,
        progress,
      }),
      ...this.getCostSnapshot(cost),
      completed,
      ...(progress.inProgress
        ? {
            inProgress: true,
            totalSeconds: progress.totalSeconds,
            remainingSeconds: progress.remainingSeconds,
            totalMs: Math.round(progress.totalSeconds * 1000),
            remainingMs: Math.round(progress.remainingSeconds * 1000),
            progress: progress.progress,
          }
        : {}),
      ...(locked ? { locked: true } : {}),
      ...(slotsFull ? { blockedReason: 'research_slots_full' } : {}),
      canResearch:
        !completed &&
        !progress.inProgress &&
        !slotsFull &&
        hasRequiredResearch &&
        hasRequiredPlayerLevel &&
        hasRequiredPrestigeCount &&
        this.getCurrencyFacade(cost.currency)?.canSpend(cost.amount),
    };
  }

  formatResearchValue({
    research,
    completed,
    hasRequiredResearch,
    hasRequiredPlayerLevel,
    hasRequiredPrestigeCount,
    cost,
    progress,
  }) {
    if (completed) {
      return this.getCompletedValue(research);
    }

    if (progress.inProgress) {
      return this.getInProgressValue(research);
    }

    if (!hasRequiredResearch || !hasRequiredPlayerLevel || !hasRequiredPrestigeCount) {
      return 'locked';
    }

    return this.formatCost(cost);
  }

  getCompletedValue(research) {
    if (research?.starLevel) {
      return formatEmeraldResearchStarLevel(research.starLevel);
    }

    if (research?.actionType === 'levelUp') {
      return `lvl ${this.normalizeResearchLevel(research.level)}`;
    }

    return 'researched';
  }

  getInProgressValue(research) {
    if (research?.actionType === 'levelUp') {
      return 'leveling up';
    }

    return 'researching';
  }

  normalizeResearchLevel(level) {
    const safeLevel = Math.floor(Number(level));
    return Number.isInteger(safeLevel) && safeLevel > 0 ? safeLevel : 1;
  }

  formatCost(cost) {
    if (cost.amount === 0) {
      return 'free';
    }

    return `${cost.amount} ${cost.currency}`;
  }

  formatDuration(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));

    if (safeSeconds < 60) {
      return `${safeSeconds}s`;
    }

    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getCurrencyFacade(currency) {
    if (currency === 'crystal') {
      return this.crystalFacade;
    }

    if (currency === 'ruby') {
      return this.rubyFacade;
    }

    if (currency === 'emerald') {
      return this.emeraldFacade;
    }

    return this.coinFacade;
  }

  getResearchCost(researchId) {
    return this.researchBalanceManager.getCost(researchId, {
      researchCostReductionLevel: this.getResearchCostReductionLevel?.() ?? 0,
    });
  }

  getCostSnapshot(cost) {
    if (cost.currency === 'crystal') {
      return {
        costCoin: 0,
        costCrystal: cost.amount,
        costCurrency: cost.currency,
      };
    }

    if (cost.currency === 'ruby') {
      return {
        costCoin: 0,
        costRuby: cost.amount,
        costCurrency: cost.currency,
      };
    }

    if (cost.currency === 'emerald') {
      return {
        costCoin: 0,
        costEmerald: cost.amount,
        costCurrency: cost.currency,
      };
    }

    return {
      costCoin: cost.amount,
    };
  }
}

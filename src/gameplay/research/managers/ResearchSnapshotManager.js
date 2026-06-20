export class ResearchSnapshotManager {
  constructor({
    crystalFacade,
    goldFacade,
    rubyFacade,
    researchBalanceManager,
    researchDefinitionManager,
    researchStateEntityManager,
  }) {
    this.crystalFacade = crystalFacade;
    this.goldFacade = goldFacade;
    this.rubyFacade = rubyFacade;
    this.researchBalanceManager = researchBalanceManager;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  getSnapshot() {
    const completedResearchIds = this.researchStateEntityManager.getCompletedResearchIds();
    const tabs = this.researchDefinitionManager
      .getVisibleResearchTabs(completedResearchIds)
      .map((tab) => ({
        ...tab,
        boxes: tab.boxes.map((box) => this.getBoxSnapshot(box)),
      }));

    return {
      tabs,
      boxes: tabs[0]?.boxes ?? [],
      completedResearchIds,
      inProgressResearches: this.researchStateEntityManager.getInProgressResearches(),
    };
  }

  getBoxSnapshot(box) {
    return {
      ...box,
      researches: box.researches.map((research) => this.getResearchSnapshot(research)),
    };
  }

  getResearchSnapshot(research) {
    const cost = this.researchBalanceManager.getCost(research.id);
    const completed = this.researchStateEntityManager.isCompleted(research.id);
    const progress = this.researchStateEntityManager.getProgressSnapshot(research.id);
    const requiredResearchIds =
      research.requiredResearchIds ??
      this.researchDefinitionManager.getRequiredResearchIds(research.id);
    const hasRequiredResearch = requiredResearchIds.every((requiredResearchId) =>
      this.researchStateEntityManager.isCompleted(requiredResearchId),
    );
    const missingRequiredPlayerLevel =
      this.researchDefinitionManager.getMissingRequiredPlayerLevel(research.id);
    const hasRequiredPlayerLevel = !missingRequiredPlayerLevel;
    const missingRequiredPrestigeCount =
      this.researchDefinitionManager.getMissingRequiredPrestigeCount(research.id);
    const hasRequiredPrestigeCount = !missingRequiredPrestigeCount;
    const locked =
      !completed &&
      !progress.inProgress &&
      (!hasRequiredResearch || !hasRequiredPlayerLevel || !hasRequiredPrestigeCount);

    return {
      ...research,
      effect: research.value,
      value: this.formatResearchValue({
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
      canResearch:
        !completed &&
        !progress.inProgress &&
        hasRequiredResearch &&
        hasRequiredPlayerLevel &&
        hasRequiredPrestigeCount &&
        this.getCurrencyFacade(cost.currency)?.canSpend(cost.amount),
    };
  }

  formatResearchValue({
    completed,
    hasRequiredResearch,
    hasRequiredPlayerLevel,
    hasRequiredPrestigeCount,
    cost,
    progress,
  }) {
    if (completed) {
      return 'researched';
    }

    if (progress.inProgress) {
      return 'researching';
    }

    if (!hasRequiredResearch || !hasRequiredPlayerLevel || !hasRequiredPrestigeCount) {
      return 'locked';
    }

    return this.formatCost(cost);
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

    return this.goldFacade;
  }

  getCostSnapshot(cost) {
    if (cost.currency === 'crystal') {
      return {
        costGold: 0,
        costCrystal: cost.amount,
        costCurrency: cost.currency,
      };
    }

    if (cost.currency === 'ruby') {
      return {
        costGold: 0,
        costRuby: cost.amount,
        costCurrency: cost.currency,
      };
    }

    return {
      costGold: cost.amount,
    };
  }
}

export class ResearchSnapshotManager {
  constructor({
    crystalFacade,
    goldFacade,
    researchBalanceManager,
    researchDefinitionManager,
    researchStateEntityManager,
  }) {
    this.crystalFacade = crystalFacade;
    this.goldFacade = goldFacade;
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
    const hasRequiredResearch = this.researchDefinitionManager
      .getRequiredResearchIds(research.id)
      .every((requiredResearchId) => this.researchStateEntityManager.isCompleted(requiredResearchId));

    return {
      ...research,
      effect: research.value,
      value: this.formatResearchValue({ completed, hasRequiredResearch, cost }),
      ...this.getCostSnapshot(cost),
      completed,
      ...(!completed && !hasRequiredResearch ? { locked: true } : {}),
      canResearch:
        !completed && hasRequiredResearch && this.getCurrencyFacade(cost.currency)?.canSpend(cost.amount),
    };
  }

  formatResearchValue({ completed, hasRequiredResearch, cost }) {
    if (completed) {
      return 'researched';
    }

    if (!hasRequiredResearch) {
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

  getCurrencyFacade(currency) {
    return currency === 'crystal' ? this.crystalFacade : this.goldFacade;
  }

  getCostSnapshot(cost) {
    if (cost.currency === 'crystal') {
      return {
        costGold: 0,
        costCrystal: cost.amount,
        costCurrency: cost.currency,
      };
    }

    return {
      costGold: cost.amount,
    };
  }
}

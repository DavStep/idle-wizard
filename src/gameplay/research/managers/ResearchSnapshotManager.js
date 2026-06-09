export class ResearchSnapshotManager {
  constructor({
    goldFacade,
    researchBalanceManager,
    researchDefinitionManager,
    researchStateEntityManager,
  }) {
    this.goldFacade = goldFacade;
    this.researchBalanceManager = researchBalanceManager;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  getSnapshot() {
    const completedResearchIds = this.researchStateEntityManager.getCompletedResearchIds();

    return {
      boxes: this.researchDefinitionManager.getVisibleResearchBoxes(completedResearchIds).map((box) => ({
        ...box,
        researches: box.researches.map((research) => this.getResearchSnapshot(research)),
      })),
      completedResearchIds,
    };
  }

  getResearchSnapshot(research) {
    const costGold = this.researchBalanceManager.getCostGold(research.id);
    const completed = this.researchStateEntityManager.isCompleted(research.id);
    const hasRequiredResearch = this.researchDefinitionManager
      .getRequiredResearchIds(research.id)
      .every((requiredResearchId) => this.researchStateEntityManager.isCompleted(requiredResearchId));

    return {
      ...research,
      effect: research.value,
      value: this.formatResearchValue({ completed, hasRequiredResearch, costGold }),
      costGold,
      completed,
      ...(!completed && !hasRequiredResearch ? { locked: true } : {}),
      canResearch: !completed && hasRequiredResearch && this.goldFacade.canSpend(costGold),
    };
  }

  formatResearchValue({ completed, hasRequiredResearch, costGold }) {
    if (completed) {
      return 'researched';
    }

    if (!hasRequiredResearch) {
      return 'locked';
    }

    return this.formatCost(costGold);
  }

  formatCost(costGold) {
    return costGold === 0 ? 'free' : `${costGold} gold`;
  }
}

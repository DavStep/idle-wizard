export class ResearchProcessManager {
  constructor({
    onResearchComplete,
    researchDefinitionManager,
    researchManaEffectManager,
    researchStateEntityManager,
  } = {}) {
    this.onResearchComplete = onResearchComplete;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchManaEffectManager = researchManaEffectManager;
    this.researchStateEntityManager = researchStateEntityManager;
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => this.update(this.getTimerDeltaSeconds(frame)),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    const completedResearchIds = this.researchStateEntityManager.advanceTime(deltaSeconds);

    if (completedResearchIds.length <= 0) {
      return;
    }

    this.researchManaEffectManager.syncCompletedEffects();

    for (const researchId of completedResearchIds) {
      const research = this.researchDefinitionManager.getResearch(researchId);

      this.onResearchComplete?.({
        researchId,
        label: research?.label ?? researchId,
        actionType: research?.actionType ?? 'research',
      });
    }
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }
}

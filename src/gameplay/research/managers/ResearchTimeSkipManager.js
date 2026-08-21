export const RESEARCH_SECONDS_PER_AMETHYST = 60;

export class ResearchTimeSkipManager {
  constructor({ amethystFacade, researchProcessManager, researchStateEntityManager }) {
    this.amethystFacade = amethystFacade;
    this.researchProcessManager = researchProcessManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  getCost(researchId) {
    const progress = this.researchStateEntityManager.getProgressSnapshot(researchId);
    if (!progress.inProgress) {
      return 0;
    }

    return Math.max(
      1,
      Math.ceil(progress.remainingSeconds / RESEARCH_SECONDS_PER_AMETHYST),
    );
  }

  canSkip(researchId) {
    const cost = this.getCost(researchId);
    return cost > 0 && this.amethystFacade.canSpend(cost);
  }

  skip(researchId) {
    const cost = this.getCost(researchId);
    if (cost <= 0) {
      return { ok: false, reason: 'not_in_progress', researchId };
    }

    if (!this.amethystFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_amethyst',
        researchId,
        cost,
        current: this.amethystFacade.getSnapshot().current,
      };
    }

    if (!this.researchProcessManager.finishResearch(researchId)) {
      this.amethystFacade.add(cost, {
        sourceType: 'research_time_skip_refund',
      });
      return { ok: false, reason: 'not_in_progress', researchId };
    }

    return { ok: true, researchId, cost, costCurrency: 'amethyst' };
  }
}

export class ResearchPurchaseManager {
  constructor({
    goldFacade,
    researchBalanceManager,
    researchDefinitionManager,
    researchManaEffectManager,
    researchStateEntityManager,
  }) {
    this.goldFacade = goldFacade;
    this.researchBalanceManager = researchBalanceManager;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchManaEffectManager = researchManaEffectManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  buyResearch(researchId) {
    const normalizedResearchId = this.researchDefinitionManager.normalizeResearchId(researchId);

    if (!this.researchDefinitionManager.hasResearch(normalizedResearchId)) {
      return {
        ok: false,
        reason: 'unknown_research',
        researchId,
      };
    }

    const cost = this.researchBalanceManager.getCostGold(normalizedResearchId);

    if (this.researchStateEntityManager.isCompleted(normalizedResearchId)) {
      return {
        ok: false,
        reason: 'already_researched',
        researchId: normalizedResearchId,
        cost,
      };
    }

    const missingRequiredResearchId = this.researchDefinitionManager
      .getRequiredResearchIds(normalizedResearchId)
      .find((requiredResearchId) => !this.researchStateEntityManager.isCompleted(requiredResearchId));

    if (missingRequiredResearchId) {
      return {
        ok: false,
        reason: 'missing_required_research',
        researchId: normalizedResearchId,
        requiredResearchId: missingRequiredResearchId,
        cost,
      };
    }

    if (!this.goldFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_gold',
        researchId: normalizedResearchId,
        cost,
      };
    }

    this.researchStateEntityManager.complete(normalizedResearchId);
    this.researchManaEffectManager.syncCompletedEffects();

    return {
      ok: true,
      researchId: normalizedResearchId,
      cost,
    };
  }
}

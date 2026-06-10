export class ResearchPurchaseManager {
  constructor({
    crystalFacade,
    goldFacade,
    researchBalanceManager,
    researchDefinitionManager,
    researchManaEffectManager,
    researchStateEntityManager,
  }) {
    this.crystalFacade = crystalFacade;
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

    const cost = this.researchBalanceManager.getCost(normalizedResearchId);

    if (this.researchStateEntityManager.isCompleted(normalizedResearchId)) {
      return {
        ok: false,
        reason: 'already_researched',
        researchId: normalizedResearchId,
        ...this.getCostResult(cost),
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
        ...this.getCostResult(cost),
      };
    }

    if (!this.getCurrencyFacade(cost.currency)?.spend(cost.amount)) {
      return {
        ok: false,
        reason: `not_enough_${cost.currency}`,
        researchId: normalizedResearchId,
        ...this.getCostResult(cost),
      };
    }

    this.researchStateEntityManager.complete(normalizedResearchId);
    this.researchManaEffectManager.syncCompletedEffects();

    return {
      ok: true,
      researchId: normalizedResearchId,
      ...this.getCostResult(cost),
    };
  }

  getCurrencyFacade(currency) {
    return currency === 'crystal' ? this.crystalFacade : this.goldFacade;
  }

  getCostResult(cost) {
    if (cost.currency === 'crystal') {
      return {
        cost: cost.amount,
        costCurrency: cost.currency,
      };
    }

    return {
      cost: cost.amount,
    };
  }
}

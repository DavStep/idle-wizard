import { applyResearchTimeReductionSeconds } from '../researchTimeResearch.js';

export class ResearchPurchaseManager {
  constructor({
    crystalFacade,
    emeraldFacade,
    coinFacade,
    rubyFacade,
    getResearchCostReductionLevel,
    getResearchTimeReductionLevel,
    researchBalanceManager,
    researchDefinitionManager,
    researchManaEffectManager,
    researchStateEntityManager,
  }) {
    this.crystalFacade = crystalFacade;
    this.emeraldFacade = emeraldFacade;
    this.coinFacade = coinFacade;
    this.rubyFacade = rubyFacade;
    this.getResearchCostReductionLevel = getResearchCostReductionLevel;
    this.getResearchTimeReductionLevel = getResearchTimeReductionLevel;
    this.researchBalanceManager = researchBalanceManager;
    this.researchDefinitionManager = researchDefinitionManager;
    this.researchManaEffectManager = researchManaEffectManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  buyResearch(researchId) {
    const normalizedResearchId = this.researchDefinitionManager.normalizeResearchId(researchId);
    const completedResearchIds = this.researchStateEntityManager.getCompletedResearchIds();
    const researchOptions = { completedResearchIds };

    if (!this.researchDefinitionManager.hasResearch(normalizedResearchId, researchOptions)) {
      return {
        ok: false,
        reason: 'unknown_research',
        researchId,
      };
    }

    const cost = this.getResearchCost(normalizedResearchId);

    if (this.researchStateEntityManager.isCompleted(normalizedResearchId)) {
      return {
        ok: false,
        reason: 'already_researched',
        researchId: normalizedResearchId,
        ...this.getCostResult(cost),
      };
    }

    if (this.researchStateEntityManager.isInProgress(normalizedResearchId)) {
      return {
        ok: false,
        reason: 'research_in_progress',
        researchId: normalizedResearchId,
        ...this.getCostResult(cost),
      };
    }

    const missingRequiredResearchId = this.researchDefinitionManager
      .getRequiredResearchIds(normalizedResearchId, researchOptions)
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

    const missingRequiredPlayerLevel =
      this.researchDefinitionManager.getMissingRequiredPlayerLevel(
        normalizedResearchId,
        researchOptions,
      );

    if (missingRequiredPlayerLevel) {
      return {
        ok: false,
        reason: 'missing_required_level',
        researchId: normalizedResearchId,
        requiredPlayerLevel: missingRequiredPlayerLevel,
        ...this.getCostResult(cost),
      };
    }

    const missingRequiredPrestigeCount =
      this.researchDefinitionManager.getMissingRequiredPrestigeCount(
        normalizedResearchId,
        researchOptions,
      );

    if (missingRequiredPrestigeCount) {
      return {
        ok: false,
        reason: 'missing_required_prestige',
        researchId: normalizedResearchId,
        requiredPrestigeCount: missingRequiredPrestigeCount,
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

    const durationSeconds = this.getReducedDurationSeconds(
      this.researchBalanceManager.getDurationSeconds(normalizedResearchId),
    );

    if (durationSeconds > 0) {
      this.researchStateEntityManager.start(normalizedResearchId, durationSeconds);

      return {
        ok: true,
        researchId: normalizedResearchId,
        durationSeconds,
        remainingSeconds: durationSeconds,
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

  getReducedDurationSeconds(durationSeconds) {
    return applyResearchTimeReductionSeconds(
      durationSeconds,
      this.getResearchTimeReductionLevel?.() ?? 0,
    );
  }

  getResearchCost(researchId) {
    return this.researchBalanceManager.getCost(researchId, {
      researchCostReductionLevel: this.getResearchCostReductionLevel?.() ?? 0,
    });
  }

  getCostResult(cost) {
    if (cost.currency !== 'coin') {
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

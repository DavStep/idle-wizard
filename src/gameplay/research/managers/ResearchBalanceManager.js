import researchBalance from '../research-balance.json';

const manaUpgradeEffectTypesBySeriesId = {
  manaProductionRate: 'manaPerSecond',
  manaSphereCap: 'manaCap',
};

export class ResearchBalanceManager {
  constructor({ balance = researchBalance } = {}) {
    this.balance = balance;
    this.costGoldByResearchId = this.readCostGoldByResearchId();
    this.manaUpgradeResearches = this.readManaUpgradeResearches();
    this.generatedCostGoldByResearchId = Object.fromEntries(
      this.manaUpgradeResearches.map((research) => [research.id, research.costGold]),
    );
    this.effectsByResearchId = Object.fromEntries(
      this.manaUpgradeResearches.map((research) => [research.id, research.effect]),
    );
    this.legacyResearchIdsByResearchId = Object.fromEntries(
      this.manaUpgradeResearches
        .filter((research) => research.level === 1)
        .map((research) => [research.seriesId, research.id]),
    );
  }

  getCostGold(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const cost =
      this.generatedCostGoldByResearchId[normalizedResearchId] ??
      this.costGoldByResearchId[normalizedResearchId];

    if (!Number.isFinite(cost)) {
      throw new Error(`research-balance.json missing gold cost for ${researchId}.`);
    }

    return cost;
  }

  getManaUpgradeResearches() {
    return this.manaUpgradeResearches.map((research) => ({
      ...research,
      effect: { ...research.effect },
    }));
  }

  getResearchEffect(researchId) {
    const effect = this.effectsByResearchId[this.normalizeResearchId(researchId)];

    return effect ? { ...effect } : null;
  }

  normalizeResearchId(researchId) {
    return this.legacyResearchIdsByResearchId[researchId] ?? researchId;
  }

  readCostGoldByResearchId() {
    const costs = this.balance?.researchCostsGold;

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('research-balance.json requires researchCostsGold.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('research-balance.json research costs must be zero or positive numbers.');
      }
    }

    return { ...costs };
  }

  readManaUpgradeResearches() {
    const series = this.balance?.manaUpgradeSeries;

    if (!series || typeof series !== 'object' || Array.isArray(series)) {
      throw new Error('research-balance.json requires manaUpgradeSeries.');
    }

    return Object.entries(manaUpgradeEffectTypesBySeriesId).flatMap(
      ([seriesId, effectType]) => {
        const config = series[seriesId];

        if (!config || typeof config !== 'object' || Array.isArray(config)) {
          throw new Error(`research-balance.json missing manaUpgradeSeries.${seriesId}.`);
        }

        const levels = this.readPositiveInteger(
          config.levels,
          `manaUpgradeSeries.${seriesId}.levels`,
        );
        const costGoldFormula = this.readLinearFormula(
          config.costGold,
          `manaUpgradeSeries.${seriesId}.costGold`,
        );
        const increaseFormula = this.readLinearFormula(
          config.increase,
          `manaUpgradeSeries.${seriesId}.increase`,
        );

        return Array.from({ length: levels }, (_unused, index) => {
          const level = index + 1;
          const costGold = this.calculateLinearFormula(costGoldFormula, level);
          const amount = this.calculateLinearFormula(increaseFormula, level);

          if (costGold < 0) {
            throw new Error(
              `research-balance.json manaUpgradeSeries.${seriesId}.costGold cannot produce negative costs.`,
            );
          }

          if (amount <= 0) {
            throw new Error(
              `research-balance.json manaUpgradeSeries.${seriesId}.increase must produce positive increases.`,
            );
          }

          return {
            id: `${seriesId}:${level}`,
            seriesId,
            level,
            costGold,
            effect: {
              type: effectType,
              amount,
            },
          };
        });
      },
    );
  }

  readPositiveInteger(value, path) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`research-balance.json ${path} must be a positive integer.`);
    }

    return value;
  }

  readLinearFormula(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`research-balance.json ${path} must be a linear formula object.`);
    }

    const base = value.base;
    const perLevel = value.perLevel ?? 0;

    if (!Number.isFinite(base) || !Number.isFinite(perLevel)) {
      throw new Error(`research-balance.json ${path} requires finite base and perLevel.`);
    }

    return { base, perLevel };
  }

  calculateLinearFormula(formula, level) {
    return formula.base + (level - 1) * formula.perLevel;
  }
}

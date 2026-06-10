import researchBalance from '../research-balance.json';

export class ResearchBalanceManager {
  constructor({ balance = researchBalance } = {}) {
    this.balance = balance;
    this.costGoldByResearchId = this.readCostGoldByResearchId();
    this.costCrystalByResearchId = this.readCostCrystalByResearchId();
    this.runtimeConfigByResearchId = new Map();
  }

  getCost(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    const costCrystal = this.costCrystalByResearchId[normalizedResearchId];

    if (Number.isFinite(costCrystal)) {
      return {
        amount: costCrystal,
        currency: 'crystal',
      };
    }

    const costGold =
      this.runtimeConfigByResearchId.get(normalizedResearchId)?.costGold ??
      this.costGoldByResearchId[normalizedResearchId];

    if (!Number.isFinite(costGold)) {
      throw new Error(`research-balance.json missing cost for ${researchId}.`);
    }

    return {
      amount: costGold,
      currency: 'gold',
    };
  }

  getCostGold(researchId) {
    const cost = this.getCost(researchId);

    return cost.currency === 'gold' ? cost.amount : 0;
  }

  getCostCrystal(researchId) {
    const cost = this.getCost(researchId);

    return cost.currency === 'crystal' ? cost.amount : 0;
  }

  getResearchEffect() {
    return null;
  }

  isResearchEnabled(researchId) {
    const normalizedResearchId = this.normalizeResearchId(researchId);
    return this.runtimeConfigByResearchId.get(normalizedResearchId)?.enabled !== false;
  }

  setRuntimeConfigs(configs = []) {
    this.runtimeConfigByResearchId = new Map();

    if (!Array.isArray(configs)) {
      return;
    }

    for (const config of configs) {
      const researchId = this.normalizeResearchId(config?.researchId);

      if (!researchId) {
        continue;
      }

      this.runtimeConfigByResearchId.set(researchId, {
        costGold: this.normalizeCostGold(config?.costGold),
        enabled: config?.enabled !== false,
      });
    }
  }

  normalizeResearchId(researchId) {
    return String(researchId ?? '').trim();
  }

  normalizeCostGold(costGold) {
    const value = Number(costGold);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.floor(value);
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

  readCostCrystalByResearchId() {
    const costs = this.balance?.researchCostsCrystal;

    if (costs === undefined) {
      return {};
    }

    if (!costs || typeof costs !== 'object' || Array.isArray(costs)) {
      throw new Error('research-balance.json researchCostsCrystal must be an object.');
    }

    for (const cost of Object.values(costs)) {
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error('research-balance.json crystal costs must be zero or positive numbers.');
      }
    }

    return { ...costs };
  }
}

import {
  getDefaultPlayerVisualSettingsCostsCrystal,
  getPlayerVisualSettingCategories,
  hasPlayerVisualSettingOption,
} from '../../../player/playerVisualSettings.js';

const MAX_VISUAL_SETTING_COST_CRYSTAL = 1_000_000;

export class VisualSettingsBalanceManager {
  constructor() {
    this.costsCrystal = getDefaultPlayerVisualSettingsCostsCrystal();
  }

  setRuntimeBalance(balance) {
    this.costsCrystal = this.readCostsCrystal(balance);
  }

  getCostCrystal(categoryKey, optionKey) {
    const category = String(categoryKey ?? '').trim();
    const key = String(optionKey ?? '').trim();

    if (!hasPlayerVisualSettingOption(category, key)) {
      return null;
    }

    return this.costsCrystal[category]?.[key] ?? 0;
  }

  getSnapshot() {
    return {
      costsCrystal: this.cloneCosts(this.costsCrystal),
    };
  }

  readCostsCrystal(balance) {
    const defaults = getDefaultPlayerVisualSettingsCostsCrystal();
    const config = balance && typeof balance === 'object' ? balance : {};
    const costsRoot =
      config.costsCrystal && typeof config.costsCrystal === 'object'
        ? config.costsCrystal
        : config;

    for (const category of getPlayerVisualSettingCategories()) {
      const source =
        costsRoot?.[category.key] && typeof costsRoot[category.key] === 'object'
          ? costsRoot[category.key]
          : {};

      for (const option of category.options) {
        defaults[category.key][option.key] = this.readCost(source[option.key]);
      }
    }

    return defaults;
  }

  readCost(value) {
    const amount = Number(value);

    if (
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > MAX_VISUAL_SETTING_COST_CRYSTAL
    ) {
      return 0;
    }

    return amount;
  }

  cloneCosts(costs) {
    return Object.fromEntries(
      Object.entries(costs).map(([category, categoryCosts]) => [
        category,
        { ...categoryCosts },
      ]),
    );
  }
}

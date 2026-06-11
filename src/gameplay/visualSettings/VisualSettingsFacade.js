import { parseGameConfig } from '../config/gameConfigSnapshot.js';
import { VisualSettingsBalanceManager } from './managers/VisualSettingsBalanceManager.js';

export class VisualSettingsFacade {
  static explain =
    'Prices player visual choices so themes, fonts, and color modes can be sold for crystal.';

  constructor({ crystalFacade } = {}) {
    this.crystalFacade = crystalFacade;
    this.balanceManager = new VisualSettingsBalanceManager();
  }

  applyRuntimeConfig(snapshot = {}) {
    this.balanceManager.setRuntimeBalance(parseGameConfig(snapshot, 'visualSettings'));
  }

  getSnapshot() {
    return this.balanceManager.getSnapshot();
  }

  getCostCrystal(categoryKey, optionKey) {
    return this.balanceManager.getCostCrystal(categoryKey, optionKey);
  }

  buyOption(categoryKey, optionKey) {
    const costCrystal = this.getCostCrystal(categoryKey, optionKey);

    if (costCrystal === null) {
      return {
        ok: false,
        reason: 'unknown_visual_setting',
      };
    }

    if (costCrystal <= 0) {
      return {
        ok: true,
        category: categoryKey,
        optionKey,
        costCrystal,
        costCurrency: 'crystal',
      };
    }

    if (!this.crystalFacade?.spend?.(costCrystal)) {
      return {
        ok: false,
        reason: 'not_enough_crystal',
        category: categoryKey,
        optionKey,
        costCrystal,
        costCurrency: 'crystal',
      };
    }

    return {
      ok: true,
      category: categoryKey,
      optionKey,
      costCrystal,
      costCurrency: 'crystal',
    };
  }
}

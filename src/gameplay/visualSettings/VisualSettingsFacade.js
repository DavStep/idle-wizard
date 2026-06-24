import { parseGameConfig } from '../config/gameConfigSnapshot.js';
import { VisualSettingsBalanceManager } from './managers/VisualSettingsBalanceManager.js';
import { VisualSettingsResearchManager } from './managers/VisualSettingsResearchManager.js';

export class VisualSettingsFacade {
  static explain =
    'Researches player visual choices so themes, fonts, colors, progress bars, plot views, and icons can unlock before selection.';

  constructor({ crystalFacade } = {}) {
    this.crystalFacade = crystalFacade;
    this.balanceManager = new VisualSettingsBalanceManager();
    this.researchManager = new VisualSettingsResearchManager();
  }

  applyRuntimeConfig(snapshot = {}) {
    this.balanceManager.setRuntimeBalance(parseGameConfig(snapshot, 'visualSettings'));
  }

  getSnapshot() {
    return {
      ...this.balanceManager.getSnapshot(),
      ...this.researchManager.getSnapshot(),
    };
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

    if (this.researchManager.isResearched(categoryKey, optionKey)) {
      return {
        ok: false,
        reason: 'already_researched',
        category: categoryKey,
        optionKey,
        costCrystal,
        costCurrency: 'crystal',
      };
    }

    if (costCrystal <= 0) {
      this.researchManager.research(categoryKey, optionKey);
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

    this.researchManager.research(categoryKey, optionKey);

    return {
      ok: true,
      category: categoryKey,
      optionKey,
      costCrystal,
      costCurrency: 'crystal',
    };
  }

  isOptionResearched(categoryKey, optionKey) {
    return this.researchManager.isResearched(categoryKey, optionKey);
  }

  getPersistenceSnapshot() {
    return this.researchManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.researchManager.applyPersistenceSnapshot(snapshot);
  }
}

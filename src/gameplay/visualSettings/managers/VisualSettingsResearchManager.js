import {
  getDefaultPlayerVisualSettingsResearched,
  hasPlayerVisualSettingOption,
} from '../../../player/playerVisualSettings.js';

export class VisualSettingsResearchManager {
  constructor() {
    this.researched = getDefaultPlayerVisualSettingsResearched();
  }

  isResearched(categoryKey, optionKey) {
    const category = String(categoryKey ?? '').trim();
    const key = String(optionKey ?? '').trim();

    if (!hasPlayerVisualSettingOption(category, key)) {
      return false;
    }

    return Boolean(this.researched[category]?.[key]);
  }

  research(categoryKey, optionKey) {
    const category = String(categoryKey ?? '').trim();
    const key = String(optionKey ?? '').trim();

    if (!hasPlayerVisualSettingOption(category, key)) {
      return false;
    }

    this.researched[category] ??= {};
    this.researched[category][key] = true;
    return true;
  }

  getSnapshot() {
    return {
      researched: this.cloneResearch(this.researched),
    };
  }

  getPersistenceSnapshot() {
    return this.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    const nextResearch = getDefaultPlayerVisualSettingsResearched();
    const source =
      snapshot?.researched && typeof snapshot.researched === 'object'
        ? snapshot.researched
        : {};

    for (const [category, options] of Object.entries(source)) {
      if (!options || typeof options !== 'object') {
        continue;
      }

      for (const [optionKey, researched] of Object.entries(options)) {
        if (researched && hasPlayerVisualSettingOption(category, optionKey)) {
          nextResearch[category][optionKey] = true;
        }
      }
    }

    this.researched = nextResearch;
  }

  cloneResearch(research) {
    return Object.fromEntries(
      Object.entries(research).map(([category, options]) => [category, { ...options }]),
    );
  }
}

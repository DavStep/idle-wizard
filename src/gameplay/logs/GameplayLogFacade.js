import { GameplayLogManager } from './managers/GameplayLogManager.js';

export class GameplayLogFacade {
  static explain =
    'Keeps a plain history of important things that happened so the player can review them later.';

  constructor({ now } = {}) {
    this.logManager = new GameplayLogManager({ now });
  }

  logSeedSummoned(result) {
    if (!result?.ok) {
      return null;
    }

    const seedText = this.formatSummonedSeeds(result);
    return this.logManager.add(`summoned ${seedText}`);
  }

  formatSummonedSeeds(result) {
    const seedCounts = Array.isArray(result.seedCounts) ? result.seedCounts : [];

    if (seedCounts.length > 0) {
      return seedCounts
        .map(({ seed, quantity = 1 }) => this.formatSeedQuantity(seed?.label, quantity))
        .join(', ');
    }

    return this.formatSeedQuantity(result.seed?.label, result.quantity ?? 1);
  }

  formatSeedQuantity(seedLabel = 'Seed', quantity = 1) {
    const label = typeof seedLabel === 'string' && seedLabel ? seedLabel : 'Seed';
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return `${label}${suffix}`;
  }

  logResearchBought({ label }) {
    return this.logManager.add(`researched ${label}`);
  }

  logShopSlotBought({ slotNumber }) {
    return this.logManager.add(`opened shelf slot ${slotNumber}`);
  }

  logGardenTileBought({ tileNumber }) {
    return this.logManager.add(`opened garden plot ${tileNumber}`);
  }

  logGardenSeedPlanted({ seed }) {
    return this.logManager.add(`planted ${seed.label}`);
  }

  logGardenHarvestCompleted({ herb, quantity = 1 }) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return this.logManager.add(`harvested ${herb.label}${suffix}`);
  }

  logBrewCompleted({ potion, quantity = 1 }) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return this.logManager.add(`brewed ${potion.label}${suffix}`);
  }

  logItemSold({ item, gold }) {
    return this.logManager.add(`sold ${item.label} for ${gold} gold`);
  }

  getSnapshot() {
    return this.logManager.getSnapshot();
  }

  getPersistenceSnapshot() {
    return this.logManager.getPersistenceSnapshot();
  }

  applyPersistenceSnapshot(snapshot) {
    this.logManager.applyPersistenceSnapshot(snapshot);
  }
}

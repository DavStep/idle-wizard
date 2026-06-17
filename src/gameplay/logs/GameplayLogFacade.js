import { GameplayLogManager } from './managers/GameplayLogManager.js';
import { formatGoldPriceText } from '../../shared/goldPrice.js';

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

  formatSeedQuantity(seedLabel = 'seed', quantity = 1) {
    const label = typeof seedLabel === 'string' && seedLabel ? seedLabel : 'seed';
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return `${label}${suffix}`;
  }

  logResearchBought({ label }) {
    return this.logManager.add(`researched ${label}`);
  }

  logShopStandBought({ marketLabel = 'market', slotNumber }) {
    return this.logManager.add(`opened ${marketLabel} stand ${slotNumber}`);
  }

  logShopSlotBought({ slotNumber }) {
    return this.logShopStandBought({ slotNumber });
  }

  logGardenTileBought({ tileNumber }) {
    return this.logManager.add(`opened garden plot ${tileNumber}`);
  }

  logBrewingCauldronBought({ cauldronNumber }) {
    return this.logManager.add(`opened cauldron ${cauldronNumber}`);
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

  logItemSold({ item, gold, quantity = 1 }) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return this.logManager.add(`sold ${item.label}${suffix} for ${formatGoldPriceText(gold)}`);
  }

  logItemBought({ item, gold, quantity = 1 }) {
    const suffix = quantity > 1 ? ` x${quantity}` : '';
    return this.logManager.add(
      `bought ${item.label}${suffix} for ${formatGoldPriceText(gold)}`,
    );
  }

  logTradeAllianceReward({ questLabel = 'daily route', crystalReward = 0 }) {
    const amount = Math.max(0, Math.floor(Number(crystalReward) || 0));

    if (amount <= 0) {
      return null;
    }

    return this.logManager.add(`claimed alliance ${questLabel} for ${amount} crystal`);
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

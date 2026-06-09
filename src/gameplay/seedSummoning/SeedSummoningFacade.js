import { SeedDropWeightManager } from './managers/SeedDropWeightManager.js';
import { SeedSummonCostManager } from './managers/SeedSummonCostManager.js';
import { SeedSummonRequestManager } from './managers/SeedSummonRequestManager.js';

export class SeedSummoningFacade {
  static explain =
    'Turns mana into a random seed, using equal odds for now and leaving room for rarity later.';

  constructor({ manaFacade, itemsFacade }) {
    this.manaFacade = manaFacade;
    this.itemsFacade = itemsFacade;
    this.seedDropWeightManager = new SeedDropWeightManager({
      itemsFacade,
    });
    this.seedSummonCostManager = new SeedSummonCostManager({
      itemsFacade,
    });
    this.seedSummonRequestManager = new SeedSummonRequestManager({
      manaFacade,
      itemsFacade,
      seedDropWeightManager: this.seedDropWeightManager,
      seedSummonCostManager: this.seedSummonCostManager,
    });
  }

  initialize() {}

  summonSeed() {
    return this.seedSummonRequestManager.summonSeed();
  }

  getSnapshot() {
    const cost = this.seedSummonCostManager.getVisibleSummonCost();

    return {
      cost,
      canSummon: this.manaFacade.canSpend(cost),
    };
  }
}

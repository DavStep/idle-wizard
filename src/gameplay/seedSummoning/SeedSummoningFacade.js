import { SeedDropWeightManager } from './managers/SeedDropWeightManager.js';
import { SeedSummonCostManager } from './managers/SeedSummonCostManager.js';
import { SeedSummonEligibilityManager } from './managers/SeedSummonEligibilityManager.js';
import { SeedSummonMultiplierManager } from './managers/SeedSummonMultiplierManager.js';
import { SeedSummonRequestManager } from './managers/SeedSummonRequestManager.js';

export class SeedSummoningFacade {
  static explain =
    'Turns mana into a researched random seed, using equal odds for now and leaving room for rarity later.';

  constructor({ manaFacade, itemsFacade, researchFacade }) {
    this.manaFacade = manaFacade;
    this.itemsFacade = itemsFacade;
    this.seedDropWeightManager = new SeedDropWeightManager();
    this.seedSummonMultiplierManager = new SeedSummonMultiplierManager({
      researchFacade,
    });
    this.seedSummonCostManager = new SeedSummonCostManager({
      itemsFacade,
      seedSummonMultiplierManager: this.seedSummonMultiplierManager,
    });
    this.seedSummonEligibilityManager = new SeedSummonEligibilityManager({
      itemsFacade,
      researchFacade,
    });
    this.seedSummonRequestManager = new SeedSummonRequestManager({
      manaFacade,
      itemsFacade,
      seedDropWeightManager: this.seedDropWeightManager,
      seedSummonCostManager: this.seedSummonCostManager,
      seedSummonEligibilityManager: this.seedSummonEligibilityManager,
      seedSummonMultiplierManager: this.seedSummonMultiplierManager,
    });
  }

  initialize() {}

  summonSeed() {
    return this.seedSummonRequestManager.summonSeed();
  }

  getSnapshot() {
    const cost = this.seedSummonCostManager.getVisibleSummonCost();
    const quantity = this.seedSummonMultiplierManager.getSummonQuantity();
    const hasSummonableSeed = this.seedSummonEligibilityManager.getSummonableSeeds().length > 0;

    return {
      cost,
      quantity,
      canSummon: hasSummonableSeed && this.manaFacade.canSpend(cost),
    };
  }
}

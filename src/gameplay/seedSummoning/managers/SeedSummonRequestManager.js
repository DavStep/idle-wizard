export class SeedSummonRequestManager {
  constructor({
    manaFacade,
    itemsFacade,
    seedDropWeightManager,
    seedSummonCostManager,
    seedSummonEligibilityManager,
    seedSummonMultiplierManager,
  }) {
    this.manaFacade = manaFacade;
    this.itemsFacade = itemsFacade;
    this.seedDropWeightManager = seedDropWeightManager;
    this.seedSummonCostManager = seedSummonCostManager;
    this.seedSummonEligibilityManager = seedSummonEligibilityManager;
    this.seedSummonMultiplierManager = seedSummonMultiplierManager;
  }

  summonSeed() {
    const summonableSeeds = this.seedSummonEligibilityManager.getSummonableSeeds();
    const visibleCost = this.seedSummonCostManager.getVisibleSummonCost();
    const quantity = this.seedSummonMultiplierManager?.getSummonQuantity() ?? 1;

    if (summonableSeeds.length === 0) {
      return {
        ok: false,
        reason: 'no_summonable_seeds',
        cost: visibleCost,
      };
    }

    const cost = visibleCost;

    if (!this.manaFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_mana',
        cost,
      };
    }

    const seeds = Array.from({ length: quantity }, () =>
      this.seedDropWeightManager.pickSeed(summonableSeeds),
    );
    const seedCounts = this.getSeedCounts(seeds);

    for (const seedCount of seedCounts) {
      this.itemsFacade.addItem(seedCount.seed.id, seedCount.quantity);
    }

    return {
      ok: true,
      seed: seeds[0],
      seeds,
      seedCounts,
      quantity,
      cost,
    };
  }

  getSeedCounts(seeds) {
    const countsById = new Map();

    for (const seed of seeds) {
      const entry = countsById.get(seed.id) ?? { seed, quantity: 0 };
      entry.quantity += 1;
      countsById.set(seed.id, entry);
    }

    return [...countsById.values()];
  }
}

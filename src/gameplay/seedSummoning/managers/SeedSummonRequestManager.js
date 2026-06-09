export class SeedSummonRequestManager {
  constructor({ manaFacade, itemsFacade, seedDropWeightManager, seedSummonCostManager }) {
    this.manaFacade = manaFacade;
    this.itemsFacade = itemsFacade;
    this.seedDropWeightManager = seedDropWeightManager;
    this.seedSummonCostManager = seedSummonCostManager;
  }

  summonSeed() {
    const seed = this.seedDropWeightManager.pickSeed();
    const cost = this.seedSummonCostManager.getSeedSummonCost(seed);

    if (!this.manaFacade.spend(cost)) {
      return {
        ok: false,
        reason: 'not_enough_mana',
        cost,
      };
    }

    this.itemsFacade.addItem(seed.id, 1);

    return {
      ok: true,
      seed,
      cost,
    };
  }
}

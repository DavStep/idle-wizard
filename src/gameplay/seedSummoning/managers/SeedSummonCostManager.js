export class SeedSummonCostManager {
  constructor({ itemsFacade }) {
    this.itemsFacade = itemsFacade;
  }

  getVisibleSummonCost() {
    return this.itemsFacade.getVisibleSummonCost();
  }

  getSeedSummonCost(seedDefinition) {
    return seedDefinition.summonManaCost;
  }
}

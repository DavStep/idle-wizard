export class SeedSummonCostManager {
  constructor({ itemsFacade, seedSummonMultiplierManager }) {
    this.itemsFacade = itemsFacade;
    this.seedSummonMultiplierManager = seedSummonMultiplierManager;
  }

  getVisibleSummonCost() {
    return this.getBaseSummonCost() * this.getSummonQuantity();
  }

  getBaseSummonCost() {
    return this.itemsFacade.getVisibleSummonCost();
  }

  getSummonQuantity() {
    return this.seedSummonMultiplierManager?.getSummonQuantity() ?? 1;
  }
}

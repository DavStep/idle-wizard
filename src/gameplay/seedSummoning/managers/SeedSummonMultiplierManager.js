const summonMultipliers = [
  { researchId: 'summonSeedsX2', quantity: 2 },
  { researchId: 'summonSeedsX3', quantity: 3 },
  { researchId: 'summonSeedsX4', quantity: 4 },
  { researchId: 'summonSeedsX5', quantity: 5 },
];

export class SeedSummonMultiplierManager {
  constructor({ researchFacade } = {}) {
    this.researchFacade = researchFacade;
  }

  getSummonQuantity() {
    return summonMultipliers.reduce((quantity, multiplier) => {
      if (!this.researchFacade?.hasCompletedResearch(multiplier.researchId)) {
        return quantity;
      }

      return Math.max(quantity, multiplier.quantity);
    }, 1);
  }
}

const summonMultipliers = [
  { researchId: 'summonSeedsX2', quantity: 2 },
  { researchId: 'summonSeedsX3', quantity: 3 },
  { researchId: 'summonSeedsX4', quantity: 4 },
  { researchId: 'summonSeedsX5', quantity: 5 },
];

export class SeedSummonMultiplierManager {
  constructor({ researchFacade } = {}) {
    this.researchFacade = researchFacade;
    this.quantityOverride = null;
  }

  getSummonQuantity() {
    const maxQuantity = this.getMaxSummonQuantity();

    if (!Number.isInteger(this.quantityOverride) || this.quantityOverride <= 0) {
      return maxQuantity;
    }

    return Math.min(this.quantityOverride, maxQuantity);
  }

  getMaxSummonQuantity() {
    return summonMultipliers.reduce((quantity, multiplier) => {
      if (!this.researchFacade?.hasCompletedResearch(multiplier.researchId)) {
        return quantity;
      }

      return Math.max(quantity, multiplier.quantity);
    }, 1);
  }

  setSummonQuantity(quantity) {
    const maxQuantity = this.getMaxSummonQuantity();
    const safeQuantity = Math.floor(Number(quantity));
    const selectedQuantity =
      Number.isInteger(safeQuantity) && safeQuantity > 0
        ? Math.min(safeQuantity, maxQuantity)
        : maxQuantity;

    this.quantityOverride = selectedQuantity < maxQuantity ? selectedQuantity : null;

    return {
      ok: true,
      quantity: this.getSummonQuantity(),
      maxQuantity,
    };
  }

  getStarLevel() {
    return Math.max(0, this.getMaxSummonQuantity() - 1);
  }

  getPersistenceSnapshot() {
    return Number.isInteger(this.quantityOverride)
      ? { quantity: this.getSummonQuantity() }
      : {};
  }

  applyPersistenceSnapshot(snapshot = {}) {
    const source = snapshot?.seedSummoning ?? snapshot;

    this.quantityOverride = null;
    if (Number.isFinite(source?.quantity)) {
      this.setSummonQuantity(source.quantity);
    }
  }
}

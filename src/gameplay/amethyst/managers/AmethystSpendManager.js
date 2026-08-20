export class AmethystSpendManager {
  constructor({ amethystEntityManager }) {
    this.amethystEntityManager = amethystEntityManager;
  }

  canSpend(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    return this.amethystEntityManager.getCurrent() >= safeAmount;
  }

  spend(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0 || !this.canSpend(safeAmount)) {
      return false;
    }

    this.amethystEntityManager.setCurrent(
      this.amethystEntityManager.getCurrent() - safeAmount,
    );
    return true;
  }
}

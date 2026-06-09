export class CrystalSpendManager {
  constructor({ crystalEntityManager }) {
    this.crystalEntityManager = crystalEntityManager;
  }

  canSpend(amount) {
    return this.crystalEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.crystalEntityManager.setCurrent(this.crystalEntityManager.getCurrent() - amount);
    return true;
  }
}

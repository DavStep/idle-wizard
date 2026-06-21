export class EmeraldSpendManager {
  constructor({ emeraldEntityManager }) {
    this.emeraldEntityManager = emeraldEntityManager;
  }

  canSpend(amount) {
    return this.emeraldEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.emeraldEntityManager.setCurrent(this.emeraldEntityManager.getCurrent() - amount);
    return true;
  }
}

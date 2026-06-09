export class GoldSpendManager {
  constructor({ goldEntityManager }) {
    this.goldEntityManager = goldEntityManager;
  }

  canSpend(amount) {
    return this.goldEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.goldEntityManager.setCurrent(this.goldEntityManager.getCurrent() - amount);
    return true;
  }
}

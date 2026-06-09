export class ManaSpendManager {
  constructor({ manaEntityManager }) {
    this.manaEntityManager = manaEntityManager;
  }

  canSpend(amount) {
    return this.manaEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.manaEntityManager.setCurrent(this.manaEntityManager.getCurrent() - amount);
    return true;
  }
}

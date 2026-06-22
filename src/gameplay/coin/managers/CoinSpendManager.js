export class CoinSpendManager {
  constructor({ coinEntityManager }) {
    this.coinEntityManager = coinEntityManager;
  }

  canSpend(amount) {
    return this.coinEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.coinEntityManager.setCurrent(this.coinEntityManager.getCurrent() - amount);
    return true;
  }
}

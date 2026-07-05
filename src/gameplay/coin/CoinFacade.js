import { CoinEntityManager } from './managers/CoinEntityManager.js';
import { CoinSpendManager } from './managers/CoinSpendManager.js';

export class CoinFacade {
  static explain =
    'Coin is market money: selling adds it, and market stands spend it.';

  constructor({ initialCurrent = 10 } = {}) {
    this.coinEntityManager = new CoinEntityManager({ initialCurrent });
    this.coinSpendManager = new CoinSpendManager({
      coinEntityManager: this.coinEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.coinEntityManager.initialize(ecsManagers);
  }

  add(amount, options) {
    this.coinEntityManager.addCurrent(amount, options);
  }

  spend(amount) {
    return this.coinSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.coinSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.coinEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.current)) {
      this.coinEntityManager.setCurrent(snapshot.current);
    }

    if (Number.isFinite(snapshot.totalGenerated)) {
      this.coinEntityManager.setTotalGenerated(snapshot.totalGenerated);
      return;
    }

    if (Number.isFinite(snapshot.current)) {
      this.coinEntityManager.setTotalGenerated(
        Math.max(this.coinEntityManager.getTotalGenerated(), snapshot.current),
      );
    }
  }
}

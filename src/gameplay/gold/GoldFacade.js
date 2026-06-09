import { GoldEntityManager } from './managers/GoldEntityManager.js';
import { GoldSpendManager } from './managers/GoldSpendManager.js';

export class GoldFacade {
  static explain =
    'Gold is shop money: selling adds it, and shop shelf slots spend it.';

  constructor({ initialCurrent = 0 } = {}) {
    this.goldEntityManager = new GoldEntityManager({ initialCurrent });
    this.goldSpendManager = new GoldSpendManager({
      goldEntityManager: this.goldEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.goldEntityManager.initialize(ecsManagers);
  }

  add(amount) {
    this.goldEntityManager.addCurrent(amount);
  }

  spend(amount) {
    return this.goldSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.goldSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.goldEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.current)) {
      this.goldEntityManager.setCurrent(snapshot.current);
    }

    if (Number.isFinite(snapshot.totalGenerated)) {
      this.goldEntityManager.setTotalGenerated(
        Math.max(snapshot.totalGenerated, this.goldEntityManager.getCurrent()),
      );
      return;
    }

    if (Number.isFinite(snapshot.current)) {
      this.goldEntityManager.setTotalGenerated(
        Math.max(this.goldEntityManager.getTotalGenerated(), snapshot.current),
      );
    }
  }
}

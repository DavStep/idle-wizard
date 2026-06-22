import { CrystalEntityManager } from './managers/CrystalEntityManager.js';
import { CrystalSpendManager } from './managers/CrystalSpendManager.js';

export class CrystalFacade {
  static explain =
    'Crystal is hard currency: it is kept separate from earned coin so premium spending can use clear rules later.';

  constructor({ initialCurrent = 0 } = {}) {
    this.crystalEntityManager = new CrystalEntityManager({ initialCurrent });
    this.crystalSpendManager = new CrystalSpendManager({
      crystalEntityManager: this.crystalEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.crystalEntityManager.initialize(ecsManagers);
  }

  add(amount) {
    this.crystalEntityManager.addCurrent(amount);
  }

  spend(amount) {
    return this.crystalSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.crystalSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.crystalEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.current)) {
      this.crystalEntityManager.setCurrent(snapshot.current);
    }
  }
}

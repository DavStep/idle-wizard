import { EmeraldEntityManager } from './managers/EmeraldEntityManager.js';
import { EmeraldSpendManager } from './managers/EmeraldSpendManager.js';

export class EmeraldFacade {
  static explain =
    'Emerald is an upgrade currency: emerald research spends it to batch planting and brewing.';

  constructor({ initialCurrent = 0 } = {}) {
    this.emeraldEntityManager = new EmeraldEntityManager({ initialCurrent });
    this.emeraldSpendManager = new EmeraldSpendManager({
      emeraldEntityManager: this.emeraldEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.emeraldEntityManager.initialize(ecsManagers);
  }

  add(amount) {
    this.emeraldEntityManager.addCurrent(amount);
  }

  spend(amount) {
    return this.emeraldSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.emeraldSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.emeraldEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.current)) {
      this.emeraldEntityManager.setCurrent(snapshot.current);
    }
  }
}

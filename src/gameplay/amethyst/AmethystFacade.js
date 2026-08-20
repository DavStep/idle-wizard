import { AmethystEntityManager } from './managers/AmethystEntityManager.js';
import { AmethystSpendManager } from './managers/AmethystSpendManager.js';

export class AmethystFacade {
  static explain =
    'Amethyst is the time-skip currency; one Amethyst pays for up to one remaining minute of research.';

  constructor({ initialCurrent = 0 } = {}) {
    this.amethystEntityManager = new AmethystEntityManager({ initialCurrent });
    this.amethystSpendManager = new AmethystSpendManager({
      amethystEntityManager: this.amethystEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.amethystEntityManager.initialize(ecsManagers);
  }

  add(amount) {
    this.amethystEntityManager.addCurrent(amount);
  }

  spend(amount) {
    return this.amethystSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.amethystSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.amethystEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.amethystEntityManager.setCurrent(snapshot?.current ?? 0);
  }
}

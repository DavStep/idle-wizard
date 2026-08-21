import { AmethystEntityManager } from './managers/AmethystEntityManager.js';
import { AmethystSpendManager } from './managers/AmethystSpendManager.js';
import { publishCurrencyGrant } from '../managers/CurrencyGrantEventManager.js';

export class AmethystFacade {
  static explain =
    'Amethyst is the time-skip currency; one Amethyst pays for up to one remaining minute of research.';

  constructor({ initialCurrent = 0, onGrant } = {}) {
    this.onGrant = onGrant;
    this.amethystEntityManager = new AmethystEntityManager({ initialCurrent });
    this.amethystSpendManager = new AmethystSpendManager({
      amethystEntityManager: this.amethystEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.amethystEntityManager.initialize(ecsManagers);
  }

  add(amount, { sourceType } = {}) {
    const previousCurrent = this.amethystEntityManager.getCurrent();
    this.amethystEntityManager.addCurrent(amount);
    publishCurrencyGrant({
      onGrant: this.onGrant,
      currency: 'amethyst',
      sourceType,
      previousCurrent,
      current: this.amethystEntityManager.getCurrent(),
    });
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

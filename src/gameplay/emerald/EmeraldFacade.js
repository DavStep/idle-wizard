import { EmeraldEntityManager } from './managers/EmeraldEntityManager.js';
import { EmeraldSpendManager } from './managers/EmeraldSpendManager.js';
import { publishCurrencyGrant } from '../managers/CurrencyGrantEventManager.js';

export class EmeraldFacade {
  static explain =
    'Emerald is an upgrade currency for advanced research such as capacity, speed, and efficiency.';

  constructor({ initialCurrent = 0, onGrant } = {}) {
    this.onGrant = onGrant;
    this.emeraldEntityManager = new EmeraldEntityManager({ initialCurrent });
    this.emeraldSpendManager = new EmeraldSpendManager({
      emeraldEntityManager: this.emeraldEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.emeraldEntityManager.initialize(ecsManagers);
  }

  add(amount, { sourceType } = {}) {
    const previousCurrent = this.emeraldEntityManager.getCurrent();
    this.emeraldEntityManager.addCurrent(amount);
    publishCurrencyGrant({
      onGrant: this.onGrant,
      currency: 'emerald',
      sourceType,
      previousCurrent,
      current: this.emeraldEntityManager.getCurrent(),
    });
  }

  setCurrent(amount) {
    this.emeraldEntityManager.setCurrent(amount);
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

import { CrystalEntityManager } from './managers/CrystalEntityManager.js';
import { CrystalSpendManager } from './managers/CrystalSpendManager.js';
import { publishCurrencyGrant } from '../managers/CurrencyGrantEventManager.js';

export class CrystalFacade {
  static explain =
    'Amber is hard currency used to level up plots and cauldrons into larger batches; its internal save key remains crystal for compatibility.';

  constructor({ initialCurrent = 0, onGrant } = {}) {
    this.onGrant = onGrant;
    this.crystalEntityManager = new CrystalEntityManager({ initialCurrent });
    this.crystalSpendManager = new CrystalSpendManager({
      crystalEntityManager: this.crystalEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.crystalEntityManager.initialize(ecsManagers);
  }

  add(amount, { sourceType } = {}) {
    const previousCurrent = this.crystalEntityManager.getCurrent();
    this.crystalEntityManager.addCurrent(amount);
    publishCurrencyGrant({
      onGrant: this.onGrant,
      currency: 'crystal',
      sourceType,
      previousCurrent,
      current: this.crystalEntityManager.getCurrent(),
    });
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

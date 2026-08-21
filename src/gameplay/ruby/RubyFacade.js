import { RubyEntityManager } from './managers/RubyEntityManager.js';
import { RubySpendManager } from './managers/RubySpendManager.js';
import { publishCurrencyGrant } from '../managers/CurrencyGrantEventManager.js';

export class RubyFacade {
  static explain =
    'Ruby is an upgrade currency for automation research that removes repeated manual actions.';

  constructor({ initialCurrent = 0, onGrant } = {}) {
    this.onGrant = onGrant;
    this.rubyEntityManager = new RubyEntityManager({ initialCurrent });
    this.rubySpendManager = new RubySpendManager({
      rubyEntityManager: this.rubyEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.rubyEntityManager.initialize(ecsManagers);
  }

  add(amount, { sourceType } = {}) {
    const previousCurrent = this.rubyEntityManager.getCurrent();
    this.rubyEntityManager.addCurrent(amount);
    publishCurrencyGrant({
      onGrant: this.onGrant,
      currency: 'ruby',
      sourceType,
      previousCurrent,
      current: this.rubyEntityManager.getCurrent(),
    });
  }

  setCurrent(amount) {
    this.rubyEntityManager.setCurrent(amount);
  }

  spend(amount) {
    return this.rubySpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.rubySpendManager.canSpend(amount);
  }

  getSnapshot() {
    return this.rubyEntityManager.getSnapshot();
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.current)) {
      this.rubyEntityManager.setCurrent(snapshot.current);
    }
  }
}

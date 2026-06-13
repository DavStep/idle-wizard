export class RubySpendManager {
  constructor({ rubyEntityManager }) {
    this.rubyEntityManager = rubyEntityManager;
  }

  canSpend(amount) {
    return this.rubyEntityManager.getCurrent() >= amount;
  }

  spend(amount) {
    if (!this.canSpend(amount)) {
      return false;
    }

    this.rubyEntityManager.setCurrent(this.rubyEntityManager.getCurrent() - amount);
    return true;
  }
}

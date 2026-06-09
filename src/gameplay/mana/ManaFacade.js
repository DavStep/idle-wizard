import { ManaCapManager } from './managers/ManaCapManager.js';
import { ManaEntityManager } from './managers/ManaEntityManager.js';
import { ManaGenerationManager } from './managers/ManaGenerationManager.js';
import { ManaSpendManager } from './managers/ManaSpendManager.js';

export class ManaFacade {
  static explain =
    'Mana is the player energy jar: it fills over time, stops at a cap, and actions can spend it.';

  constructor({
    initialCurrent = 0,
    initialCap = 50,
    initialPerSecond = 1,
  } = {}) {
    this.initialCap = initialCap;
    this.initialPerSecond = initialPerSecond;
    this.manaEntityManager = new ManaEntityManager({
      initialCurrent,
      initialCap,
      initialPerSecond,
    });
    this.manaCapManager = new ManaCapManager({
      manaEntityManager: this.manaEntityManager,
    });
    this.manaSpendManager = new ManaSpendManager({
      manaEntityManager: this.manaEntityManager,
    });
    this.manaGenerationManager = new ManaGenerationManager({
      manaEntityManager: this.manaEntityManager,
    });
  }

  initialize(ecsManagers) {
    this.manaEntityManager.initialize(ecsManagers);
    this.manaGenerationManager.register(ecsManagers.systems);
  }

  spend(amount) {
    return this.manaSpendManager.spend(amount);
  }

  canSpend(amount) {
    return this.manaSpendManager.canSpend(amount);
  }

  getSnapshot() {
    return {
      ...this.manaEntityManager.getSnapshot(),
      cap: this.manaCapManager.getCap(),
    };
  }

  setResearchUpgradeEffects({ capIncrease = 0, perSecondIncrease = 0 } = {}) {
    this.manaEntityManager.setCap(this.initialCap + capIncrease);
    this.manaEntityManager.setPerSecond(this.initialPerSecond + perSecondIncrease);
  }

  applyPersistenceSnapshot(snapshot = {}) {
    if (Number.isFinite(snapshot.cap)) {
      this.manaEntityManager.setCap(snapshot.cap);
    }

    if (Number.isFinite(snapshot.perSecond)) {
      this.manaEntityManager.setPerSecond(snapshot.perSecond);
    }

    if (Number.isFinite(snapshot.current)) {
      this.manaEntityManager.setCurrent(snapshot.current);
    }
  }
}

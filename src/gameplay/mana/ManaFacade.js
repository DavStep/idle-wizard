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
}

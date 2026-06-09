export class ManaCapManager {
  constructor({ manaEntityManager }) {
    this.manaEntityManager = manaEntityManager;
  }

  getCap() {
    return this.manaEntityManager.getCap();
  }
}

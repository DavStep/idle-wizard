export class ManaUpgradeEffectManager {
  constructor({ manaEntityManager, initialCap, initialPerSecond }) {
    this.manaEntityManager = manaEntityManager;
    this.levelMaxCap = initialCap;
    this.levelPerSecond = initialPerSecond;
    this.researchCapIncrease = 0;
    this.researchPerSecondIncrease = 0;
  }

  setLevelUpgradeEffects({ maxManaCap, manaPerSecond } = {}) {
    if (Number.isFinite(maxManaCap)) {
      this.levelMaxCap = Math.max(0, maxManaCap);
    }

    if (Number.isFinite(manaPerSecond)) {
      this.levelPerSecond = Math.max(0, manaPerSecond);
    }

    this.apply();
  }

  setResearchUpgradeEffects({ capIncrease = 0, perSecondIncrease = 0 } = {}) {
    this.researchCapIncrease = Math.max(0, Number.isFinite(capIncrease) ? capIncrease : 0);
    this.researchPerSecondIncrease = Math.max(
      0,
      Number.isFinite(perSecondIncrease) ? perSecondIncrease : 0,
    );
    this.apply();
  }

  apply() {
    this.manaEntityManager.setCap(this.levelMaxCap + this.researchCapIncrease);
    this.manaEntityManager.setPerSecond(this.levelPerSecond + this.researchPerSecondIncrease);
  }
}

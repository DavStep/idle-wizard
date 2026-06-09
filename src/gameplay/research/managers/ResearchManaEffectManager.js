export class ResearchManaEffectManager {
  constructor({ manaFacade, researchBalanceManager, researchStateEntityManager }) {
    this.manaFacade = manaFacade;
    this.researchBalanceManager = researchBalanceManager;
    this.researchStateEntityManager = researchStateEntityManager;
  }

  syncCompletedEffects() {
    const totals = {
      capIncrease: 0,
      perSecondIncrease: 0,
    };

    for (const researchId of this.researchStateEntityManager.getCompletedResearchIds()) {
      const effect = this.researchBalanceManager.getResearchEffect(researchId);

      if (!effect) {
        continue;
      }

      if (effect.type === 'manaCap') {
        totals.capIncrease += effect.amount;
      }

      if (effect.type === 'manaPerSecond') {
        totals.perSecondIncrease += effect.amount;
      }
    }

    this.manaFacade.setResearchUpgradeEffects(totals);
  }
}

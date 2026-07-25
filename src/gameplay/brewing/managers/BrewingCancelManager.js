export class BrewingCancelManager {
  constructor({ brewingProcessEntityManager, disableAutoBrew } = {}) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.disableAutoBrew = disableAutoBrew;
  }

  cancel(cauldronIndex = 0) {
    const activeBrew =
      this.brewingProcessEntityManager.getActiveBrewSnapshot(cauldronIndex);

    if (!activeBrew) {
      return {
        ok: false,
        reason: 'no_brew',
      };
    }

    if (activeBrew.phase !== 'brewing' && activeBrew.phase !== 'bottling') {
      return {
        ok: false,
        reason: 'brew_not_cancellable',
        phase: activeBrew.phase,
      };
    }

    this.brewingProcessEntityManager.clearActiveBrew(activeBrew.cauldronIndex);
    this.disableAutoBrew?.(activeBrew.cauldronIndex);

    return {
      ok: true,
      cauldronIndex: activeBrew.cauldronIndex,
      cauldronNumber: activeBrew.cauldronNumber,
      destroyedQuantity: activeBrew.resultQuantity,
    };
  }
}

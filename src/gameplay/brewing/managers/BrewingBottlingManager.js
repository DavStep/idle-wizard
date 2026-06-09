export class BrewingBottlingManager {
  constructor({ brewingProcessEntityManager }) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
  }

  startBottling() {
    const activeBrew = this.brewingProcessEntityManager.getActiveBrewSnapshot();

    if (!activeBrew) {
      return {
        ok: false,
        reason: 'no_brew',
      };
    }

    if (activeBrew.phase === 'bottling') {
      return {
        ok: false,
        reason: 'bottling_in_progress',
      };
    }

    if (activeBrew.canCollect) {
      return {
        ok: false,
        reason: 'bottling_done',
      };
    }

    if (!activeBrew.canStartBottling) {
      return {
        ok: false,
        reason: 'brew_not_done',
      };
    }

    const startedBrew = this.brewingProcessEntityManager.startBottling();

    if (!startedBrew) {
      return {
        ok: false,
        reason: 'brew_not_done',
      };
    }

    return {
      ok: true,
      potion: {
        itemTypeId: startedBrew.resultItemTypeId,
        key: startedBrew.key,
        label: startedBrew.label,
        kind: 'potion',
      },
      durationMs: startedBrew.totalMs,
    };
  }
}

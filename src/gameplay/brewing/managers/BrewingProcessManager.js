export class BrewingProcessManager {
  constructor({
    brewingProcessEntityManager,
    collectReadyBrews,
    isCauldronActive,
  } = {}) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.collectReadyBrews = collectReadyBrews;
    this.isCauldronActive = isCauldronActive ?? (() => true);
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => this.update(this.getTimerDeltaSeconds(frame)),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    this.brewingProcessEntityManager.advanceTime(
      deltaSeconds,
      this.isCauldronActive,
    );
    this.collectReadyBrews?.();
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }
}

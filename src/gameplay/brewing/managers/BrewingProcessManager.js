export class BrewingProcessManager {
  constructor({ brewingProcessEntityManager } = {}) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
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
    this.brewingProcessEntityManager.advanceTime(deltaSeconds);
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }
}

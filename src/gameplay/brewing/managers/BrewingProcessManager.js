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
      update: (_world, frame) => this.update(frame.deltaSeconds),
    });
    this.registered = true;
  }

  update(deltaSeconds) {
    this.brewingProcessEntityManager.advanceTime(deltaSeconds);
  }
}

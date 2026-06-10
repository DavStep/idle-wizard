export class ManaGenerationManager {
  constructor({ manaEntityManager }) {
    this.manaEntityManager = manaEntityManager;
    this.registered = false;
  }

  register(systemManager) {
    if (this.registered) {
      return;
    }

    systemManager.register({
      update: (_world, frame) => {
        const amount = this.manaEntityManager.getPerSecond() * this.getTimerDeltaSeconds(frame);
        this.manaEntityManager.addCurrent(amount);
      },
    });
    this.registered = true;
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }
}

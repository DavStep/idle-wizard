import { PlayerAmethyst } from '../components/AmethystComponents.js';

export class AmethystEntityManager {
  constructor({ initialCurrent = 0 } = {}) {
    this.initialCurrent = initialCurrent;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerAmethyst);
    this.setCurrent(this.initialCurrent);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Amethyst entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerAmethyst.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    PlayerAmethyst.current[this.getEntityId()] = Math.max(0, Math.floor(Number(value) || 0));
  }

  addCurrent(amount) {
    this.setCurrent(this.getCurrent() + amount);
  }

  getSnapshot() {
    return { current: this.getCurrent() };
  }
}

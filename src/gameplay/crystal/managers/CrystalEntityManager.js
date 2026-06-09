import { PlayerCrystal } from '../components/CrystalComponents.js';

export class CrystalEntityManager {
  constructor({ initialCurrent = 0 } = {}) {
    this.initialCurrent = initialCurrent;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerCrystal);
    this.setCurrent(this.initialCurrent);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Crystal entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerCrystal.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    PlayerCrystal.current[this.getEntityId()] = Math.max(0, value);
  }

  addCurrent(amount) {
    this.setCurrent(this.getCurrent() + amount);
  }

  getSnapshot() {
    return {
      current: this.getCurrent(),
    };
  }
}

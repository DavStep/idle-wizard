import { PlayerGold } from '../components/GoldComponents.js';

export class GoldEntityManager {
  constructor({ initialCurrent = 0 } = {}) {
    this.initialCurrent = initialCurrent;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerGold);
    this.setCurrent(this.initialCurrent);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Gold entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerGold.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    PlayerGold.current[this.getEntityId()] = Math.max(0, value);
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

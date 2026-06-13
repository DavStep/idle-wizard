import { PlayerRuby } from '../components/RubyComponents.js';

export class RubyEntityManager {
  constructor({ initialCurrent = 0 } = {}) {
    this.initialCurrent = initialCurrent;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerRuby);
    this.setCurrent(this.initialCurrent);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Ruby entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerRuby.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    PlayerRuby.current[this.getEntityId()] = Math.max(0, value);
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

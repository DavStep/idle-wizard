import { PlayerMana } from '../components/ManaComponents.js';

export class ManaEntityManager {
  constructor({ initialCurrent, initialCap, initialPerSecond }) {
    this.initialCurrent = initialCurrent;
    this.initialCap = initialCap;
    this.initialPerSecond = initialPerSecond;
    this.ecsManagers = null;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    this.ecsManagers = ecsManagers;

    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerMana);
    PlayerMana.cap[this.entityId] = this.initialCap;
    PlayerMana.perSecond[this.entityId] = this.initialPerSecond;
    this.setCurrent(this.initialCurrent);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Mana entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerMana.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    const entityId = this.getEntityId();
    PlayerMana.current[entityId] = Math.max(0, Math.min(value, this.getCap()));
  }

  addCurrent(amount) {
    this.setCurrent(this.getCurrent() + amount);
  }

  getCap() {
    return PlayerMana.cap[this.getEntityId()] ?? 0;
  }

  getPerSecond() {
    return PlayerMana.perSecond[this.getEntityId()] ?? 0;
  }

  getSnapshot() {
    return {
      current: this.getCurrent(),
      cap: this.getCap(),
      perSecond: this.getPerSecond(),
    };
  }
}

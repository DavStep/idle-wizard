import { PlayerGold } from '../components/GoldComponents.js';
import { normalizeGoldPrice } from '../../../shared/goldPrice.js';

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
    this.setTotalGenerated(0);
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
    PlayerGold.current[this.getEntityId()] = normalizeGoldPrice(value) ?? 0;
  }

  addCurrent(amount) {
    if (amount > 0) {
      this.addTotalGenerated(amount);
    }

    this.setCurrent(this.getCurrent() + amount);
  }

  getTotalGenerated() {
    return PlayerGold.totalGenerated[this.getEntityId()] ?? 0;
  }

  setTotalGenerated(value) {
    PlayerGold.totalGenerated[this.getEntityId()] = normalizeGoldPrice(value) ?? 0;
  }

  addTotalGenerated(amount) {
    this.setTotalGenerated(this.getTotalGenerated() + amount);
  }

  getSnapshot() {
    return {
      current: this.getCurrent(),
      totalGenerated: this.getTotalGenerated(),
    };
  }
}

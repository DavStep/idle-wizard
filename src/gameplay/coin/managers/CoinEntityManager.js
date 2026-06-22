import { PlayerCoin } from '../components/CoinComponents.js';
import { normalizeCoinPrice } from '../../../shared/coinPrice.js';

export class CoinEntityManager {
  constructor({ initialCurrent = 0 } = {}) {
    this.initialCurrent = initialCurrent;
    this.entityId = null;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, PlayerCoin);
    this.setCurrent(this.initialCurrent);
    this.setTotalGenerated(0);
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Coin entity has not been initialized.');
    }

    return this.entityId;
  }

  getCurrent() {
    return PlayerCoin.current[this.getEntityId()] ?? 0;
  }

  setCurrent(value) {
    PlayerCoin.current[this.getEntityId()] = normalizeCoinPrice(value) ?? 0;
  }

  addCurrent(amount, { trackGenerated = true } = {}) {
    if (trackGenerated && amount > 0) {
      this.addTotalGenerated(amount);
    }

    this.setCurrent(this.getCurrent() + amount);
  }

  getTotalGenerated() {
    return PlayerCoin.totalGenerated[this.getEntityId()] ?? 0;
  }

  setTotalGenerated(value) {
    PlayerCoin.totalGenerated[this.getEntityId()] = normalizeCoinPrice(value) ?? 0;
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

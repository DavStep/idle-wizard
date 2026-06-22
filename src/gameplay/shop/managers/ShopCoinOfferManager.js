import { ShopCoinOffer } from '../components/ShopComponents.js';

export const SHOP_COIN_OFFER_COOLDOWN_SECONDS = 2 * 60 * 60;
export const SHOP_COIN_OFFER_COIN_PER_LEVEL = 20;

export class ShopCoinOfferManager {
  constructor({ coinFacade, playerLevelFacade } = {}) {
    this.coinFacade = coinFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.entityId = null;
    this.registered = false;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, ShopCoinOffer);
    ShopCoinOffer.cooldownRemainingSeconds[this.entityId] = 0;
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
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    this.setCooldownRemainingSeconds(this.getCooldownRemainingSeconds() - deltaSeconds);
  }

  collect() {
    if (!this.canCollect()) {
      return {
        ok: false,
        reason: 'cooldown',
        cooldownRemainingSeconds: this.getCooldownRemainingSeconds(),
      };
    }

    const coin = this.getRewardCoin();

    if (coin <= 0) {
      return {
        ok: false,
        reason: 'empty_reward',
      };
    }

    this.coinFacade?.add(coin);
    this.setCooldownRemainingSeconds(SHOP_COIN_OFFER_COOLDOWN_SECONDS);

    return {
      ok: true,
      coin,
      cooldownSeconds: SHOP_COIN_OFFER_COOLDOWN_SECONDS,
    };
  }

  canCollect() {
    return this.getCooldownRemainingSeconds() <= 0;
  }

  getRewardCoin() {
    return Math.max(1, this.getCurrentLevel()) * SHOP_COIN_OFFER_COIN_PER_LEVEL;
  }

  getCurrentLevel() {
    const level = this.playerLevelFacade?.getSnapshot?.().currentLevel;
    return Number.isInteger(level) && level > 0 ? level : 1;
  }

  getCooldownRemainingSeconds() {
    return ShopCoinOffer.cooldownRemainingSeconds[this.getEntityId()] ?? 0;
  }

  setCooldownRemainingSeconds(seconds) {
    ShopCoinOffer.cooldownRemainingSeconds[this.getEntityId()] = Math.max(
      0,
      Number.isFinite(seconds) ? seconds : 0,
    );
  }

  getSnapshot() {
    const cooldownRemainingSeconds = this.getCooldownRemainingSeconds();

    return {
      rewardCoin: this.getRewardCoin(),
      currentLevel: this.getCurrentLevel(),
      cooldownSeconds: SHOP_COIN_OFFER_COOLDOWN_SECONDS,
      cooldownRemainingSeconds,
      remainingMs: Math.ceil(cooldownRemainingSeconds * 1_000),
      ready: cooldownRemainingSeconds <= 0,
      canCollect: cooldownRemainingSeconds <= 0,
    };
  }

  getPersistenceSnapshot() {
    return {
      cooldownRemainingSeconds: this.getCooldownRemainingSeconds(),
    };
  }

  applyPersistenceSnapshot(snapshot = {}) {
    this.setCooldownRemainingSeconds(snapshot?.cooldownRemainingSeconds);
  }

  getTimerDeltaSeconds(frame = {}) {
    return Number.isFinite(frame.timerDeltaSeconds)
      ? frame.timerDeltaSeconds
      : frame.deltaSeconds;
  }

  getEntityId() {
    if (this.entityId === null) {
      throw new Error('Shop coin offer has not been initialized.');
    }

    return this.entityId;
  }
}

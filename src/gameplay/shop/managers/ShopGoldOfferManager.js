import { ShopGoldOffer } from '../components/ShopComponents.js';

export const SHOP_GOLD_OFFER_COOLDOWN_SECONDS = 2 * 60 * 60;
export const SHOP_GOLD_OFFER_GOLD_PER_LEVEL = 20;

export class ShopGoldOfferManager {
  constructor({ goldFacade, playerLevelFacade } = {}) {
    this.goldFacade = goldFacade;
    this.playerLevelFacade = playerLevelFacade;
    this.entityId = null;
    this.registered = false;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, ShopGoldOffer);
    ShopGoldOffer.cooldownRemainingSeconds[this.entityId] = 0;
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

    const gold = this.getRewardGold();

    if (gold <= 0) {
      return {
        ok: false,
        reason: 'empty_reward',
      };
    }

    this.goldFacade?.add(gold);
    this.setCooldownRemainingSeconds(SHOP_GOLD_OFFER_COOLDOWN_SECONDS);

    return {
      ok: true,
      gold,
      cooldownSeconds: SHOP_GOLD_OFFER_COOLDOWN_SECONDS,
    };
  }

  canCollect() {
    return this.getCooldownRemainingSeconds() <= 0;
  }

  getRewardGold() {
    return Math.max(1, this.getCurrentLevel()) * SHOP_GOLD_OFFER_GOLD_PER_LEVEL;
  }

  getCurrentLevel() {
    const level = this.playerLevelFacade?.getSnapshot?.().currentLevel;
    return Number.isInteger(level) && level > 0 ? level : 1;
  }

  getCooldownRemainingSeconds() {
    return ShopGoldOffer.cooldownRemainingSeconds[this.getEntityId()] ?? 0;
  }

  setCooldownRemainingSeconds(seconds) {
    ShopGoldOffer.cooldownRemainingSeconds[this.getEntityId()] = Math.max(
      0,
      Number.isFinite(seconds) ? seconds : 0,
    );
  }

  getSnapshot() {
    const cooldownRemainingSeconds = this.getCooldownRemainingSeconds();

    return {
      rewardGold: this.getRewardGold(),
      currentLevel: this.getCurrentLevel(),
      cooldownSeconds: SHOP_GOLD_OFFER_COOLDOWN_SECONDS,
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
      throw new Error('Shop gold offer has not been initialized.');
    }

    return this.entityId;
  }
}

import { ShopDailyCrystalOffer } from '../components/ShopComponents.js';

export const SHOP_DAILY_CRYSTAL_OFFER_COOLDOWN_SECONDS = 24 * 60 * 60;
export const SHOP_DAILY_CRYSTAL_OFFER_REWARD = 1;

export class ShopDailyCrystalOfferManager {
  constructor({ crystalFacade } = {}) {
    this.crystalFacade = crystalFacade;
    this.entityId = null;
    this.registered = false;
  }

  initialize(ecsManagers) {
    if (this.entityId !== null) {
      return;
    }

    this.entityId = ecsManagers.entities.createEntity();
    ecsManagers.components.add(this.entityId, ShopDailyCrystalOffer);
    ShopDailyCrystalOffer.cooldownRemainingSeconds[this.entityId] = 0;
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

    this.crystalFacade?.add(SHOP_DAILY_CRYSTAL_OFFER_REWARD);
    this.setCooldownRemainingSeconds(SHOP_DAILY_CRYSTAL_OFFER_COOLDOWN_SECONDS);

    return {
      ok: true,
      crystal: SHOP_DAILY_CRYSTAL_OFFER_REWARD,
      cooldownSeconds: SHOP_DAILY_CRYSTAL_OFFER_COOLDOWN_SECONDS,
    };
  }

  canCollect() {
    return this.getCooldownRemainingSeconds() <= 0;
  }

  hasFrameTimerWork() {
    return this.getCooldownRemainingSeconds() > 0;
  }

  getCooldownRemainingSeconds() {
    return ShopDailyCrystalOffer.cooldownRemainingSeconds[this.getEntityId()] ?? 0;
  }

  setCooldownRemainingSeconds(seconds) {
    ShopDailyCrystalOffer.cooldownRemainingSeconds[this.getEntityId()] = Math.max(
      0,
      Number.isFinite(seconds) ? seconds : 0,
    );
  }

  getSnapshot() {
    const cooldownRemainingSeconds = this.getCooldownRemainingSeconds();

    return {
      rewardCrystal: SHOP_DAILY_CRYSTAL_OFFER_REWARD,
      cooldownSeconds: SHOP_DAILY_CRYSTAL_OFFER_COOLDOWN_SECONDS,
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
      throw new Error('Shop daily crystal offer has not been initialized.');
    }

    return this.entityId;
  }
}

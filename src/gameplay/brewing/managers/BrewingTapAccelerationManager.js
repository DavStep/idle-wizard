export const BREWING_CAULDRON_TAP_REDUCTION_SECONDS = 1;
export const BREWING_CAULDRON_TAP_COOLDOWN_MS = 720;

export class BrewingTapAccelerationManager {
  constructor({ brewingProcessEntityManager, now = () => Date.now() } = {}) {
    this.brewingProcessEntityManager = brewingProcessEntityManager;
    this.now = now;
    this.lastAcceptedTapAtByCauldron = new Map();
  }

  accelerate(cauldronIndex = 0) {
    const safeCauldronIndex = Math.floor(Number(cauldronIndex));
    if (!Number.isInteger(safeCauldronIndex) || safeCauldronIndex < 0) {
      return { ok: false, reason: 'invalid_cauldron' };
    }

    const now = Number(this.now());
    const lastAcceptedAt =
      this.lastAcceptedTapAtByCauldron.get(safeCauldronIndex);
    if (
      Number.isFinite(now) &&
      Number.isFinite(lastAcceptedAt) &&
      now - lastAcceptedAt < BREWING_CAULDRON_TAP_COOLDOWN_MS
    ) {
      return {
        ok: false,
        reason: 'tap_cooldown',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
        cooldownMs: BREWING_CAULDRON_TAP_COOLDOWN_MS,
        retryAfterMs: Math.max(
          0,
          BREWING_CAULDRON_TAP_COOLDOWN_MS - (now - lastAcceptedAt),
        ),
      };
    }

    const previous =
      this.brewingProcessEntityManager.getActiveBrewSnapshot(
        safeCauldronIndex,
      );
    const previousRemainingMs = Math.max(
      0,
      Number(previous?.remainingMs) || 0,
    );
    if (
      !previous ||
      (previous.phase !== 'brewing' && previous.phase !== 'bottling') ||
      previousRemainingMs <= 0
    ) {
      return {
        ok: false,
        reason: 'not_processing',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    const activeBrew =
      this.brewingProcessEntityManager.reduceRemainingSeconds(
        BREWING_CAULDRON_TAP_REDUCTION_SECONDS,
        safeCauldronIndex,
      );
    const reducedSeconds = Math.max(
      0,
      (previousRemainingMs - (activeBrew?.remainingMs ?? 0)) / 1_000,
    );
    if (!activeBrew || reducedSeconds <= 0) {
      return {
        ok: false,
        reason: 'not_processing',
        cauldronIndex: safeCauldronIndex,
        cauldronNumber: safeCauldronIndex + 1,
      };
    }

    if (Number.isFinite(now)) {
      this.lastAcceptedTapAtByCauldron.set(safeCauldronIndex, now);
    }
    return {
      ok: true,
      cauldronIndex: safeCauldronIndex,
      cauldronNumber: safeCauldronIndex + 1,
      phase: activeBrew.phase,
      reducedSeconds,
      remainingMs: activeBrew.remainingMs,
      cooldownMs: BREWING_CAULDRON_TAP_COOLDOWN_MS,
    };
  }

  reset() {
    this.lastAcceptedTapAtByCauldron.clear();
  }
}

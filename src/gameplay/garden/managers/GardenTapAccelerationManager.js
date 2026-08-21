export const GARDEN_PLOT_TAP_REDUCTION_RATIO = 0.3;
export const GARDEN_PLOT_TAP_COOLDOWN_MS = 504;

export class GardenTapAccelerationManager {
  constructor({ gardenTileEntityManager, now = () => Date.now() } = {}) {
    this.gardenTileEntityManager = gardenTileEntityManager;
    this.now = now;
    this.lastAcceptedTapAtByTile = new Map();
  }

  accelerate(tileNumber) {
    const safeTileNumber = Math.floor(Number(tileNumber));
    if (!Number.isInteger(safeTileNumber) || safeTileNumber <= 0) {
      return { ok: false, reason: 'invalid_tile' };
    }

    const now = Number(this.now());
    const lastAcceptedAt = this.lastAcceptedTapAtByTile.get(safeTileNumber);
    if (
      Number.isFinite(now) &&
      Number.isFinite(lastAcceptedAt) &&
      now - lastAcceptedAt < GARDEN_PLOT_TAP_COOLDOWN_MS
    ) {
      return {
        ok: false,
        reason: 'tap_cooldown',
        tileNumber: safeTileNumber,
        cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
        retryAfterMs: Math.max(
          0,
          GARDEN_PLOT_TAP_COOLDOWN_MS - (now - lastAcceptedAt),
        ),
      };
    }

    const previous = this.gardenTileEntityManager
      .getTileSnapshots()
      .find((tile) => tile.tileNumber === safeTileNumber);
    const previousRemainingMs = Math.max(
      0,
      Number(previous?.remainingMs) || 0,
    );
    if (
      !previous ||
      (previous.phase !== 'growing' && previous.phase !== 'harvesting') ||
      previousRemainingMs <= 0
    ) {
      return {
        ok: false,
        reason: 'not_processing',
        tileNumber: safeTileNumber,
      };
    }

    const requestedReductionSeconds =
      Math.round(
        previousRemainingMs * GARDEN_PLOT_TAP_REDUCTION_RATIO,
      ) / 1_000;
    const reduction =
      this.gardenTileEntityManager.reduceTileProcessRemainingSeconds(
        safeTileNumber,
        requestedReductionSeconds,
      );
    if (!reduction || reduction.reducedSeconds <= 0) {
      return {
        ok: false,
        reason: 'not_processing',
        tileNumber: safeTileNumber,
      };
    }

    if (Number.isFinite(now)) {
      this.lastAcceptedTapAtByTile.set(safeTileNumber, now);
    }
    return {
      ok: true,
      tileNumber: safeTileNumber,
      phase: reduction.phase,
      reducedSeconds: Math.round(reduction.reducedSeconds * 1_000) / 1_000,
      remainingMs: Math.ceil(reduction.remainingSeconds * 1_000),
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    };
  }

  reset() {
    this.lastAcceptedTapAtByTile.clear();
  }
}

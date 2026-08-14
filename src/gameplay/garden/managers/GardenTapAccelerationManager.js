export const GARDEN_PLOT_TAP_REDUCTION_SECONDS = 1;
export const GARDEN_PLOT_TAP_COOLDOWN_MS = 800;

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

    const reduction =
      this.gardenTileEntityManager.reduceTileProcessRemainingSeconds(
        safeTileNumber,
        GARDEN_PLOT_TAP_REDUCTION_SECONDS,
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
      reducedSeconds: reduction.reducedSeconds,
      remainingMs: Math.ceil(reduction.remainingSeconds * 1_000),
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    };
  }

  reset() {
    this.lastAcceptedTapAtByTile.clear();
  }
}

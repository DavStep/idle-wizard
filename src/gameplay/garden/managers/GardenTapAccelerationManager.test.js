import { describe, expect, it, vi } from 'vitest';

import {
  GARDEN_PLOT_TAP_COOLDOWN_MS,
  GARDEN_PLOT_TAP_REDUCTION_RATIO,
  GardenTapAccelerationManager,
} from './GardenTapAccelerationManager.js';

describe('GardenTapAccelerationManager', () => {
  it('removes 30% of the remaining timer and rejects repeated taps until the feedback window ends', () => {
    expect(GARDEN_PLOT_TAP_COOLDOWN_MS).toBe(504);
    expect(GARDEN_PLOT_TAP_REDUCTION_RATIO).toBe(0.3);

    let now = 1_000;
    const getTileSnapshots = vi.fn(() => [{
      tileNumber: 2,
      phase: 'growing',
      remainingMs: 9_000,
    }]);
    const reduceTileProcessRemainingSeconds = vi.fn(() => ({
      phase: 'growing',
      reducedSeconds: 2.7,
      remainingSeconds: 6.3,
    }));
    const manager = new GardenTapAccelerationManager({
      gardenTileEntityManager: {
        getTileSnapshots,
        reduceTileProcessRemainingSeconds,
      },
      now: () => now,
    });

    expect(manager.accelerate(2)).toEqual({
      ok: true,
      tileNumber: 2,
      phase: 'growing',
      reducedSeconds: 2.7,
      remainingMs: 6_300,
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenCalledWith(2, 2.7);

    now += GARDEN_PLOT_TAP_COOLDOWN_MS - 1;
    expect(manager.accelerate(2)).toMatchObject({
      ok: false,
      reason: 'tap_cooldown',
      retryAfterMs: 1,
    });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenCalledTimes(1);

    now += 1;
    expect(manager.accelerate(2)).toMatchObject({ ok: true });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenCalledTimes(2);
  });

  it('does not start a cooldown when the plot has no active timer', () => {
    let now = 2_000;
    const getTileSnapshots = vi
      .fn()
      .mockReturnValueOnce([{ tileNumber: 1, phase: 'ready', remainingMs: 0 }])
      .mockReturnValueOnce([{
        tileNumber: 1,
        phase: 'harvesting',
        remainingMs: 400,
      }]);
    const reduceTileProcessRemainingSeconds = vi.fn(() => ({
      phase: 'harvesting',
      reducedSeconds: 0.12,
      remainingSeconds: 0.28,
    }));
    const manager = new GardenTapAccelerationManager({
      gardenTileEntityManager: {
        getTileSnapshots,
        reduceTileProcessRemainingSeconds,
      },
      now: () => now,
    });

    expect(manager.accelerate(1)).toMatchObject({
      ok: false,
      reason: 'not_processing',
    });
    expect(manager.accelerate(1)).toEqual({
      ok: true,
      tileNumber: 1,
      phase: 'harvesting',
      reducedSeconds: 0.12,
      remainingMs: 280,
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenCalledWith(1, 0.12);
  });
});

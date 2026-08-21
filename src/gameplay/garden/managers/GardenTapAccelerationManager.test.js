import { describe, expect, it, vi } from 'vitest';

import {
  GARDEN_PLOT_TAP_COOLDOWN_MS,
  GARDEN_PLOT_TAP_REDUCTION_SECONDS,
  GardenTapAccelerationManager,
} from './GardenTapAccelerationManager.js';

describe('GardenTapAccelerationManager', () => {
  it('removes one second and rejects repeated taps until the feedback window ends', () => {
    expect(GARDEN_PLOT_TAP_COOLDOWN_MS).toBe(504);
    expect(GARDEN_PLOT_TAP_REDUCTION_SECONDS).toBe(1);

    let now = 1_000;
    const reduceTileProcessRemainingSeconds = vi.fn(() => ({
      phase: 'growing',
      reducedSeconds: 1,
      remainingSeconds: 8,
    }));
    const manager = new GardenTapAccelerationManager({
      gardenTileEntityManager: {
        reduceTileProcessRemainingSeconds,
      },
      now: () => now,
    });

    expect(manager.accelerate(2)).toEqual({
      ok: true,
      tileNumber: 2,
      phase: 'growing',
      reducedSeconds: 1,
      remainingMs: 8_000,
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenCalledWith(2, 1);

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
    const reduceTileProcessRemainingSeconds = vi
      .fn()
      .mockReturnValueOnce({
        phase: 'ready',
        reducedSeconds: 0,
        remainingSeconds: 0,
      })
      .mockReturnValueOnce({
        phase: 'harvesting',
        reducedSeconds: 0.4,
        remainingSeconds: 0,
      });
    const manager = new GardenTapAccelerationManager({
      gardenTileEntityManager: {
        reduceTileProcessRemainingSeconds,
      },
      now: () => 2_000,
    });

    expect(manager.accelerate(1)).toMatchObject({
      ok: false,
      reason: 'not_processing',
    });
    expect(manager.accelerate(1)).toEqual({
      ok: true,
      tileNumber: 1,
      phase: 'harvesting',
      reducedSeconds: 0.4,
      remainingMs: 0,
      cooldownMs: GARDEN_PLOT_TAP_COOLDOWN_MS,
    });
    expect(reduceTileProcessRemainingSeconds).toHaveBeenNthCalledWith(1, 1, 1);
    expect(reduceTileProcessRemainingSeconds).toHaveBeenNthCalledWith(2, 1, 1);
  });
});

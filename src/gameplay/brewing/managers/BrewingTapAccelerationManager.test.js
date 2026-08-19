import { describe, expect, it, vi } from 'vitest';

import {
  BREWING_CAULDRON_TAP_COOLDOWN_MS,
  BrewingTapAccelerationManager,
} from './BrewingTapAccelerationManager.js';

describe('BrewingTapAccelerationManager', () => {
  it('removes one second and rejects repeated taps until the feedback window ends', () => {
    let now = 1_000;
    const getActiveBrewSnapshot = vi.fn(() => ({
      phase: 'brewing',
      remainingSeconds: 9,
      remainingMs: 9_000,
    }));
    const reduceRemainingSeconds = vi.fn(() => ({
      phase: 'brewing',
      remainingSeconds: 8,
      remainingMs: 8_000,
    }));
    const manager = new BrewingTapAccelerationManager({
      brewingProcessEntityManager: {
        getActiveBrewSnapshot,
        reduceRemainingSeconds,
      },
      now: () => now,
    });

    expect(manager.accelerate(1)).toEqual({
      ok: true,
      cauldronIndex: 1,
      cauldronNumber: 2,
      phase: 'brewing',
      reducedSeconds: 1,
      remainingMs: 8_000,
      cooldownMs: BREWING_CAULDRON_TAP_COOLDOWN_MS,
    });

    now += BREWING_CAULDRON_TAP_COOLDOWN_MS - 1;
    expect(manager.accelerate(1)).toMatchObject({
      ok: false,
      reason: 'tap_cooldown',
      retryAfterMs: 1,
    });
    expect(reduceRemainingSeconds).toHaveBeenCalledTimes(1);

    now += 1;
    expect(manager.accelerate(1)).toMatchObject({ ok: true });
    expect(reduceRemainingSeconds).toHaveBeenCalledTimes(2);
  });

  it('does not start a cooldown when the cauldron has no running timer', () => {
    const getActiveBrewSnapshot = vi
      .fn()
      .mockReturnValueOnce({
        phase: 'ready',
        remainingSeconds: 0,
        remainingMs: 0,
      })
      .mockReturnValueOnce({
        phase: 'bottling',
        remainingSeconds: 0.4,
        remainingMs: 400,
      });
    const reduceRemainingSeconds = vi.fn(() => ({
      phase: 'bottling',
      remainingSeconds: 0,
      remainingMs: 0,
    }));
    const manager = new BrewingTapAccelerationManager({
      brewingProcessEntityManager: {
        getActiveBrewSnapshot,
        reduceRemainingSeconds,
      },
      now: () => 2_000,
    });

    expect(manager.accelerate(0)).toMatchObject({
      ok: false,
      reason: 'not_processing',
    });
    expect(manager.accelerate(0)).toEqual({
      ok: true,
      cauldronIndex: 0,
      cauldronNumber: 1,
      phase: 'bottling',
      reducedSeconds: 0.4,
      remainingMs: 0,
      cooldownMs: BREWING_CAULDRON_TAP_COOLDOWN_MS,
    });
  });
});

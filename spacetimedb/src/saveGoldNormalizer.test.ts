import { describe, expect, it } from 'vitest';

import {
  MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD,
  normalizeSaveGold,
  readSaveTotalGeneratedGold,
} from './saveGoldNormalizer';

describe('normalizeSaveGold', () => {
  it('does not count the fresh starting coin grant as generated leaderboard income', () => {
    expect(
      normalizeSaveGold({
        current: 10,
        totalGenerated: 0,
      }),
    ).toEqual({
      current: 10,
      totalGenerated: 0,
    });
    expect(readSaveTotalGeneratedGold({ current: 10, totalGenerated: 0 })).toBe(0);
  });

  it('uses current coin as generated income only for legacy saves missing the total', () => {
    expect(normalizeSaveGold({ current: 10 })).toEqual({
      current: 10,
      totalGenerated: 10,
    });
    expect(readSaveTotalGeneratedGold({ current: 10 })).toBe(10);
  });

  it('preserves a legitimate 750k coin balance across backend save normalization', () => {
    expect(
      normalizeSaveGold({
        current: 750_000,
        totalGenerated: 800_000,
      }),
    ).toEqual({
      current: 750_000,
      totalGenerated: 800_000,
    });
  });

  it('rounds legacy fractional coin upward without removing player coin', () => {
    expect(
      normalizeSaveGold({
        current: 1.01,
        totalGenerated: 10.01,
      }),
    ).toEqual({
      current: 2,
      totalGenerated: 11,
    });
  });

  it('still caps current and lifetime coin at the server save ceiling', () => {
    expect(
      normalizeSaveGold({
        current: MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD + 1,
        totalGenerated: MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD + 1,
      }),
    ).toEqual({
      current: MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD,
      totalGenerated: MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD,
    });
  });
});

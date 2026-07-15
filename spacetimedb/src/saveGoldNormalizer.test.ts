import { describe, expect, it } from 'vitest';

import {
  MAX_PLAYER_SAVE_TOTAL_GENERATED_GOLD,
  normalizeSaveGold,
} from './saveGoldNormalizer';

describe('normalizeSaveGold', () => {
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

import { describe, expect, it } from 'vitest';

import { normalizeWorldEventLeaderboardPoints } from './worldEventLeaderboardPoints';

describe('normalizeWorldEventLeaderboardPoints', () => {
  it('preserves a legitimate uncapped weekly contribution total', () => {
    expect(normalizeWorldEventLeaderboardPoints(133_000_000n)).toBe(133_000_000n);
  });

  it('normalizes negative internal values to zero', () => {
    expect(normalizeWorldEventLeaderboardPoints(-1n)).toBe(0n);
  });
});

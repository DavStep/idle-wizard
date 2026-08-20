import { describe, expect, it } from 'vitest';

import { normalizeLeaderboardIncome } from './leaderboardIncome';

describe('normalizeLeaderboardIncome', () => {
  it('preserves leaderboard totals without an application-level cap', () => {
    expect(
      normalizeLeaderboardIncome(9_000_000_000_000_000_000n),
    ).toBe(9_000_000_000_000_000_000n);
  });

  it('normalizes negative internal values to zero', () => {
    expect(normalizeLeaderboardIncome(-1n)).toBe(0n);
  });
});

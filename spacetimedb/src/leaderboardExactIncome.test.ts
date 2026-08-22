import { describe, expect, it } from 'vitest';

import {
  createLeaderboardIncomeFields,
  MAX_LEGACY_LEADERBOARD_INCOME,
  parseLeaderboardIncome,
  readLeaderboardIncome,
} from './leaderboardExactIncome';

describe('exact leaderboard income', () => {
  it('stores arbitrary whole-number scores while saturating only the legacy mirror', () => {
    const income = 10n ** 2_044n;

    expect(createLeaderboardIncomeFields('totalIncome', income)).toEqual({
      totalIncome: MAX_LEGACY_LEADERBOARD_INCOME,
      totalIncomeExact: income.toString(),
    });
  });

  it('prefers exact score fields and falls back to legacy rows', () => {
    expect(
      readLeaderboardIncome(
        { totalIncome: 25n, totalIncomeExact: (10n ** 2_044n).toString() },
        'totalIncome',
      ),
    ).toBe(10n ** 2_044n);
    expect(readLeaderboardIncome({ totalIncome: 25n }, 'totalIncome')).toBe(25n);
  });

  it('rejects negative and malformed reports', () => {
    expect(parseLeaderboardIncome('-1')).toBeNull();
    expect(parseLeaderboardIncome('10aa')).toBeNull();
  });
});

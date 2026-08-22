import { describe, expect, it } from 'vitest';

import { formatBigNumber } from './bigNumber.js';

describe('big number formatting', () => {
  it('uses the compact notation shared by player-facing totals', () => {
    expect(formatBigNumber(999)).toBe('999');
    expect(formatBigNumber(1_234)).toBe('1.23k');
    expect(formatBigNumber(12_345_678)).toBe('12.3m');
    expect(formatBigNumber(9_876_543_210n)).toBe('9.87b');
  });

  it('continues compact suffixes without an application-level display cap', () => {
    expect(formatBigNumber(10_000_000_000_000_000n)).toBe('10aa');
    expect(formatBigNumber(10n ** 2_044n)).toBe('10aaa');
  });
});

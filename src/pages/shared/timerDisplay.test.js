import { describe, expect, it } from 'vitest';

import { formatRemainingTime } from './timerDisplay.js';

describe('timerDisplay', () => {
  it('formats active timer remaining values without decimals', () => {
    expect(formatRemainingTime(0)).toBe('0s');
    expect(formatRemainingTime(1)).toBe('1s');
    expect(formatRemainingTime(6_000)).toBe('6s');
    expect(formatRemainingTime(75_000)).toBe('1m 15s');
    expect(formatRemainingTime(300_000)).toBe('5m');
    expect(formatRemainingTime(3_900_000)).toBe('1h 5m');
  });

  it('clamps invalid or negative remaining values to zero', () => {
    expect(formatRemainingTime(-1_000)).toBe('0s');
    expect(formatRemainingTime(Number.NaN)).toBe('0s');
    expect(formatRemainingTime(undefined)).toBe('0s');
  });
});

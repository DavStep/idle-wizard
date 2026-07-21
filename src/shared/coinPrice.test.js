import { describe, expect, it } from 'vitest';

import {
  formatCoinAmount,
  formatCoinPrice,
  formatCoinPriceText,
  normalizeCoinPrice,
  parsePositiveCoinPrice,
} from './coinPrice.js';

describe('coin price formatting', () => {
  it('formats editable prices as whole coin values', () => {
    expect(formatCoinPrice(25)).toBe('25');
    expect(formatCoinPrice(3.2)).toBe('4');
    expect(parsePositiveCoinPrice('3')).toBe(3);
    expect(parsePositiveCoinPrice('3.2')).toBeNull();
  });

  it('rounds positive fractional coin up with a one-coin minimum', () => {
    expect(normalizeCoinPrice(0)).toBe(0);
    expect(normalizeCoinPrice(0.01)).toBe(1);
    expect(normalizeCoinPrice(1.01)).toBe(2);
  });

  it('formats visible coin as compact amount-first text', () => {
    expect(formatCoinPriceText(0)).toBe('0 coin');
    expect(formatCoinPriceText(25)).toBe('25 coin');
    expect(formatCoinPriceText(3.25)).toBe('4 coin');
    expect(formatCoinPriceText(1_000)).toBe('1k coin');
    expect(formatCoinPriceText(123_234)).toBe('123k coin');
  });

  it('uses compact suffixes without rounding up player-visible amounts', () => {
    expect(formatCoinAmount(1_234)).toBe('1.23k');
    expect(formatCoinAmount(12_345)).toBe('12.3k');
    expect(formatCoinAmount(999_999)).toBe('999k');
    expect(formatCoinAmount(1_000_000)).toBe('1m');
  });
});

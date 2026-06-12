import { describe, expect, it } from 'vitest';

import {
  formatGoldAmount,
  formatGoldPrice,
  formatGoldPriceText,
} from './goldPrice.js';

describe('gold price formatting', () => {
  it('keeps exact price formatting for editable price inputs', () => {
    expect(formatGoldPrice(25)).toBe('25.00');
    expect(formatGoldPrice(3.2)).toBe('3.20');
  });

  it('formats visible gold as compact amount-first text', () => {
    expect(formatGoldPriceText(0)).toBe('0 gold');
    expect(formatGoldPriceText(25)).toBe('25 gold');
    expect(formatGoldPriceText(3.25)).toBe('3.25 gold');
    expect(formatGoldPriceText(123_234)).toBe('123k gold');
  });

  it('uses compact suffixes without rounding up player-visible amounts', () => {
    expect(formatGoldAmount(1_234)).toBe('1.23k');
    expect(formatGoldAmount(12_345)).toBe('12.3k');
    expect(formatGoldAmount(999_999)).toBe('999k');
    expect(formatGoldAmount(1_000_000)).toBe('1m');
  });
});

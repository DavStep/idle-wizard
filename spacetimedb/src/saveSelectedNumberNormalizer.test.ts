import { describe, expect, it } from 'vitest';

import { normalizeSaveSelectedNumber } from './saveSelectedNumberNormalizer';

describe('save selected number normalization', () => {
  it('keeps an omitted max cauldron quantity unset instead of changing it to x1', () => {
    expect(normalizeSaveSelectedNumber(null, 5)).toBeNull();
    expect(normalizeSaveSelectedNumber(undefined, 5)).toBeNull();
  });

  it('preserves explicit selections and clamps them to the accepted range', () => {
    expect(normalizeSaveSelectedNumber(4, 5)).toBe(4);
    expect(normalizeSaveSelectedNumber(0, 5)).toBe(1);
    expect(normalizeSaveSelectedNumber(9, 5)).toBe(5);
  });

  it('rejects selections when no numbered option is available', () => {
    expect(normalizeSaveSelectedNumber(1, 0)).toBeNull();
  });
});

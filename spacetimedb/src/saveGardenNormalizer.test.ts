import { describe, expect, it } from 'vitest';

import { normalizeGardenSelectedSeedItemKey } from './saveGardenNormalizer';

describe('player gameplay save Garden normalization', () => {
  const itemCatalog = new Map([
    ['sageSeed', 'seed'],
    ['sageHerb', 'herb'],
  ]);

  it('preserves a selected seed from the Garden toolbar', () => {
    expect(
      normalizeGardenSelectedSeedItemKey('sageSeed', itemCatalog),
    ).toBe('sageSeed');
  });

  it('defaults legacy, unknown, and non-seed selections to no selection', () => {
    expect(normalizeGardenSelectedSeedItemKey('', itemCatalog)).toBeNull();
    expect(
      normalizeGardenSelectedSeedItemKey('missingSeed', itemCatalog),
    ).toBeNull();
    expect(
      normalizeGardenSelectedSeedItemKey('sageHerb', itemCatalog),
    ).toBeNull();
  });
});

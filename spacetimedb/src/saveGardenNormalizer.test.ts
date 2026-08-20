import { describe, expect, it } from 'vitest';

import {
  normalizeGardenPlotAutomationSettings,
  normalizeGardenSelectedSeedItemKey,
} from "./saveGardenNormalizer";

describe("player gameplay save Garden normalization", () => {
  const itemCatalog = new Map([
    ['sageSeed', 'seed'],
    ['sageHerb', 'herb'],
  ]);

  it("preserves a selected seed from the Garden toolbar", () => {
    expect(
      normalizeGardenSelectedSeedItemKey('sageSeed', itemCatalog),
    ).toBe('sageSeed');
  });

  it("defaults legacy, unknown, and non-seed selections to no selection", () => {
    expect(normalizeGardenSelectedSeedItemKey('', itemCatalog)).toBeNull();
    expect(
      normalizeGardenSelectedSeedItemKey('missingSeed', itemCatalog),
    ).toBeNull();
    expect(
      normalizeGardenSelectedSeedItemKey('sageHerb', itemCatalog),
    ).toBeNull();
  });

  it("preserves per-plot Auto and xN settings while keeping legacy automation on", () => {
    expect(
      normalizeGardenPlotAutomationSettings({
        autoEnabled: false,
        plantQuantity: 4,
      }),
    ).toEqual({ autoEnabled: false, plantQuantity: 4 });
    expect(normalizeGardenPlotAutomationSettings()).toEqual({
      autoEnabled: true,
      plantQuantity: null,
    });
    expect(normalizeGardenPlotAutomationSettings({ plantQuantity: 6 })).toEqual(
      { autoEnabled: true, plantQuantity: null },
    );
  });
});

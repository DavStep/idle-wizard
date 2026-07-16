import { describe, expect, it } from 'vitest';

import { normalizeSaveCauldronAutomationState } from './saveBrewingNormalizer';

describe('player gameplay save brewing normalization', () => {
  it('preserves automation state for every accepted cauldron', () => {
    const sourceCauldrons = Array.from({ length: 10 }, (_unused, index) => ({
      cauldronNumber: index + 1,
      autoBrewEnabled: true,
      autoBrewArmed: index % 2 === 0,
      autoBrewRecipeKey: 'manaTonic',
    }));
    const normalizedCauldrons = sourceCauldrons.map((cauldron) => ({
      cauldronNumber: cauldron.cauldronNumber,
      ...normalizeSaveCauldronAutomationState(cauldron),
    }));

    for (const cauldron of normalizedCauldrons) {
      const source = sourceCauldrons[cauldron.cauldronNumber - 1];

      expect(cauldron).toMatchObject({
        cauldronNumber: source.cauldronNumber,
        autoBrewEnabled: source.autoBrewEnabled,
        autoBrewArmed: source.autoBrewArmed,
        autoBrewRecipeKey: source.autoBrewRecipeKey,
      });
    }
  });

  it('keeps legacy enabled cauldrons armed when the old save has no armed field', () => {
    expect(
      normalizeSaveCauldronAutomationState({
        autoBrewEnabled: true,
        autoBrewArmed: undefined,
        autoBrewRecipeKey: 'manaTonic',
      }),
    ).toEqual({
      autoBrewEnabled: true,
      autoBrewArmed: true,
      autoBrewRecipeKey: 'manaTonic',
    });
  });
});

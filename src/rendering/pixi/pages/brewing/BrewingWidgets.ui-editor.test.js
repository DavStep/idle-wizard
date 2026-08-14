import { describe, expect, it } from 'vitest';

import integrations from './BrewingWidgets.ui-editor.js';

describe('Brewing widget UI editor integrations', () => {
  it('keeps every reusable Brewing widget independently selectable', () => {
    expect(integrations.map(({ id }) => id)).toEqual([
      'compound.brewing-cauldron',
      'compound.brewing-cauldron-row',
      'compound.brewing-cauldron-button',
      'compound.brewing-inventory-panel',
      'compound.brewing-inventory-row',
      'compound.brewing-inventory-opener',
      'compound.brewing-recipe-card',
      'compound.brewing-recipe-ingredient-row',
      'compound.brewing-batch-detail',
      'compound.brewing-ingredient-picker-slot',
      'compound.brewing-automation-toggle',
    ]);
    expect(integrations.every(({ kind, scenarios }) =>
      kind === 'widget' && scenarios.length > 0 &&
      scenarios.every(({ mount }) => typeof mount === 'function')),
    ).toBe(true);
  });
});

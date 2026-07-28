import { describe, expect, it } from 'vitest';

import { BrewingBalanceManager } from './BrewingBalanceManager.js';

describe('BrewingBalanceManager', () => {
  it('supports six cauldron ingredients by default', () => {
    expect(new BrewingBalanceManager().getMaxCauldronIngredients()).toBe(6);
  });
});

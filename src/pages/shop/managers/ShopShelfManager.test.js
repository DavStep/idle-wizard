import { describe, expect, it } from 'vitest';

import { ShopPlayerShelfManager } from './ShopPlayerShelfManager.js';
import { ShopShelfManager } from './ShopShelfManager.js';

describe('ShopShelfManager', () => {
  it('shows zero-cost NPC market stand buys as free', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });
});

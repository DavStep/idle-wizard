import { describe, expect, it } from 'vitest';

import { ShopSellAvailabilityManager } from './ShopSellAvailabilityManager.js';

describe('ShopSellAvailabilityManager', () => {
  it('subtracts reserved item quantities from market availability', () => {
    const manager = new ShopSellAvailabilityManager({
      itemsFacade: {
        getItemQuantity: (itemTypeId) => (itemTypeId === 1001 ? 3 : 1),
      },
      getReservedItemQuantity: (itemTypeId) => (itemTypeId === 1001 ? 2 : 0),
    });

    expect(manager.getAvailableQuantity(1001)).toBe(1);
    expect(manager.getAvailableQuantity(1001, 1)).toBe(2);
    expect(manager.canRemoveItem(1001, 2)).toBe(false);
    expect(manager.getAvailableSellableItems([
      { itemTypeId: 1001, key: 'sageHerb', quantity: 3 },
      { itemTypeId: 1, key: 'sageSeed', quantity: 1 },
    ])).toEqual([
      { itemTypeId: 1001, key: 'sageHerb', quantity: 1 },
      { itemTypeId: 1, key: 'sageSeed', quantity: 1 },
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { ShopPlayerShelfListingManager } from './ShopPlayerShelfListingManager.js';
import { ShopSellAvailabilityManager } from './ShopSellAvailabilityManager.js';

const sageHerb = {
  id: 1001,
  key: 'sageHerb',
  label: 'Sage',
  kind: 'herb',
};

function createPlayerShelfEntityManager() {
  let slot = {
    slotNumber: 1,
    itemTypeId: null,
    quantity: 0,
    priceGold: 0,
  };

  return {
    getSelectedSlotNumber: () => 1,
    getSlotSnapshots: () => [slot],
    assignSlotListing: vi.fn((_slotNumber, listing) => {
      slot = {
        ...slot,
        ...listing,
      };
      return true;
    }),
  };
}

describe('ShopPlayerShelfListingManager', () => {
  it('does not reserve cauldron-staged herbs for player market listings', () => {
    let quantity = 3;
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      if (quantity < removeQuantity) {
        return false;
      }

      quantity -= removeQuantity;
      return true;
    });
    const itemsFacade = {
      getItemDefinition: () => sageHerb,
      getItemQuantity: () => quantity,
      removeItem,
    };
    const manager = new ShopPlayerShelfListingManager({
      goldFacade: {},
      itemsFacade,
      shopSellKindManager: {
        isSellKind: () => true,
      },
      shopSellAvailabilityManager: new ShopSellAvailabilityManager({
        itemsFacade,
        getReservedItemQuantity: () => 2,
      }),
      shopPlayerShelfEntityManager: createPlayerShelfEntityManager(),
    });

    expect(
      manager.setSelectedSlotListing({
        itemTypeId: 1001,
        quantity: 2,
        priceGold: 4,
      }),
    ).toEqual({
      ok: false,
      reason: 'not_enough_item',
      itemTypeId: 1001,
      availableQuantity: 1,
      quantity: 2,
    });
    expect(removeItem).not.toHaveBeenCalled();

    expect(
      manager.setSelectedSlotListing({
        itemTypeId: 1001,
        quantity: 1,
        priceGold: 4,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceGold: 4,
    });
    expect(quantity).toBe(2);
  });

  it('keeps player market listing prices as two-decimal values', () => {
    const spend = vi.fn().mockReturnValue(true);
    const addItem = vi.fn();
    const removeItem = vi.fn().mockReturnValue(true);
    const itemsFacade = {
      getItemDefinition: () => sageHerb,
      safeGetDefinitionByKey: () => sageHerb,
      getItemQuantity: () => 3,
      removeItem,
      addItem,
    };
    const manager = new ShopPlayerShelfListingManager({
      goldFacade: { spend },
      itemsFacade,
      shopSellKindManager: {
        isSellKind: () => true,
      },
      shopPlayerShelfEntityManager: createPlayerShelfEntityManager(),
    });

    expect(
      manager.setSelectedSlotListing({
        itemTypeId: 1001,
        quantity: 1,
        priceGold: 4.25,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceGold: 4.25,
    });

    expect(
      manager.buyListingItem({
        itemKey: 'sageHerb',
        quantity: 3,
        priceGold: 0.75,
      }),
    ).toMatchObject({
      ok: true,
      priceGold: 0.75,
      totalPriceGold: 2.25,
    });
    expect(spend).toHaveBeenCalledWith(2.25);
  });
});

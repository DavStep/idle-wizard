import { describe, expect, it, vi } from 'vitest';

import { ShopPlayerShelfListingManager } from './ShopPlayerShelfListingManager.js';
import { ShopSellAvailabilityManager } from './ShopSellAvailabilityManager.js';

const sageHerb = {
  id: 1001,
  key: 'sageHerb',
  label: 'sage',
  kind: 'herb',
};

function createPlayerShelfEntityManager() {
  let slot = {
    slotNumber: 1,
    itemTypeId: null,
    quantity: 0,
    priceCoin: 0,
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
      coinFacade: {},
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
        priceCoin: 4,
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
        priceCoin: 4,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceCoin: 4,
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
      coinFacade: { spend },
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
        priceCoin: 4.25,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceCoin: 4.25,
    });

    expect(
      manager.buyListingItem({
        itemKey: 'sageHerb',
        quantity: 3,
        priceCoin: 0.75,
      }),
    ).toMatchObject({
      ok: true,
      priceCoin: 0.75,
      totalPriceCoin: 2.25,
    });
    expect(spend).toHaveBeenCalledWith(2.25);
  });

  it('rejects player market listing quantities and prices above the backend cap', () => {
    const removeItem = vi.fn().mockReturnValue(true);
    const manager = new ShopPlayerShelfListingManager({
      coinFacade: {},
      itemsFacade: {
        getItemDefinition: () => sageHerb,
        getItemQuantity: () => 2_000,
        removeItem,
      },
      shopSellKindManager: {
        isSellKind: () => true,
      },
      shopPlayerShelfEntityManager: createPlayerShelfEntityManager(),
    });

    expect(
      manager.setSelectedSlotListing({
        itemTypeId: 1001,
        quantity: 1_001,
        priceCoin: 1,
      }),
    ).toEqual({
      ok: false,
      reason: 'quantity_too_high',
      maxQuantity: 1_000,
    });
    expect(
      manager.setSelectedSlotListing({
        itemTypeId: 1001,
        quantity: 1,
        priceCoin: 1_000_000.01,
      }),
    ).toEqual({
      ok: false,
      reason: 'price_too_high',
      maxPriceCoin: 1_000_000,
    });
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('adds player sale proceeds without generated-coin tracking', () => {
    const add = vi.fn();
    const manager = new ShopPlayerShelfListingManager({
      coinFacade: { add },
      itemsFacade: {},
      shopSellKindManager: {},
      shopPlayerShelfEntityManager: createPlayerShelfEntityManager(),
    });

    expect(manager.claimSaleProceeds(5)).toEqual({
      ok: true,
      coin: 5,
    });
    expect(add).toHaveBeenCalledWith(5, { trackGenerated: false });
  });
});

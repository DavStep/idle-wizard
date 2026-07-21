import { describe, expect, it, vi } from 'vitest';
import { ShopShelfSlotSelectionManager } from './ShopShelfSlotSelectionManager.js';

const items = new Map([
  [1, { id: 1, key: 'sageSeed', kind: 'seed', label: 'sage seed' }],
  [2, { id: 2, key: 'mintSeed', kind: 'seed', label: 'mint seed' }],
]);

function createHarness({ inventoryQuantity = 100, loadedQuantity = 0 } = {}) {
  let inventory = inventoryQuantity;
  const slot = {
    slotNumber: 1,
    unlocked: true,
    sellItemTypeId: loadedQuantity > 0 ? 1 : null,
    loadedQuantity,
    sellProgressSeconds: 0,
  };
  const removeItem = vi.fn((_itemTypeId, quantity) => {
    if (inventory < quantity) return false;
    inventory -= quantity;
    return true;
  });
  const addItem = vi.fn((_itemTypeId, quantity) => {
    inventory += quantity;
  });
  const manager = new ShopShelfSlotSelectionManager({
    itemsFacade: {
      addItem,
      getItemDefinition: (itemTypeId) => items.get(itemTypeId),
      getItemQuantity: () => inventory,
      removeItem,
    },
    shopSellKindManager: { isSellKind: (kind) => kind === 'seed' },
    shopShelfEntityManager: {
      assignSlotSellItem: (_slotNumber, itemTypeId, quantity) => {
        slot.sellItemTypeId = itemTypeId;
        slot.loadedQuantity = quantity;
        return true;
      },
      changeSlotLoadedQuantity: (_slotNumber, delta) => {
        slot.loadedQuantity = Math.max(0, slot.loadedQuantity + delta);
        if (slot.loadedQuantity === 0) slot.sellItemTypeId = null;
        return slot.loadedQuantity;
      },
      getSelectedSlotNumber: () => 1,
      getSlotSnapshots: () => [{ ...slot }],
      selectSlot: () => true,
    },
    shopSellAvailabilityManager: { getAvailableQuantity: () => inventory },
    getAccessibleSlotCount: () => 1,
    getItemAccess: () => ({ tradedHere: true }),
  });

  return { addItem, getInventory: () => inventory, manager, removeItem, slot };
}

describe('ShopShelfSlotSelectionManager', () => {
  it('physically transfers loaded stock out of inventory and returns it on unload', () => {
    const { getInventory, manager, slot } = createHarness();

    expect(manager.loadSelectedSlot(1, 25)).toMatchObject({
      ok: true,
      quantity: 25,
      loadedQuantity: 25,
    });
    expect(getInventory()).toBe(75);
    expect(slot).toMatchObject({ sellItemTypeId: 1, loadedQuantity: 25 });

    expect(manager.unloadSelectedSlot(10)).toMatchObject({
      ok: true,
      quantity: 10,
      loadedQuantity: 15,
    });
    expect(getInventory()).toBe(85);
  });

  it('rejects a different item until the loaded item is fully removed', () => {
    const { manager, slot } = createHarness({ loadedQuantity: 5 });

    expect(manager.loadSelectedSlot(2, 1)).toEqual({
      ok: false,
      reason: 'different_item_loaded',
      itemTypeId: 2,
    });
    expect(slot).toMatchObject({ sellItemTypeId: 1, loadedQuantity: 5 });
  });

  it('caps a single transfer request and the total persisted stand capacity', () => {
    const nearFull = createHarness({ inventoryQuantity: 20_000, loadedQuantity: 999_995 });

    expect(nearFull.manager.loadSelectedSlot(1, 50_000)).toMatchObject({
      ok: true,
      quantity: 5,
      loadedQuantity: 1_000_000,
    });
    expect(nearFull.manager.loadSelectedSlot(1, 1)).toMatchObject({
      ok: false,
      reason: 'stall_full',
    });
  });

  it('does not mutate inventory for invalid or market-locked requests', () => {
    const harness = createHarness();
    harness.manager.getItemAccess = () => ({ tradedHere: false, requiredMarket: 'city' });

    expect(harness.manager.loadSelectedSlot(1, 1)).toMatchObject({
      ok: false,
      reason: 'market_locked',
    });
    expect(harness.manager.loadSelectedSlot(1, 0)).toMatchObject({
      ok: false,
      reason: 'invalid_quantity',
    });
    expect(harness.getInventory()).toBe(100);
    expect(harness.removeItem).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ShopShelfFutureLoadManager } from './ShopShelfFutureLoadManager.js';

function createHarness({ inventoryQuantity = 100, loadedQuantity = 0 } = {}) {
  let inventory = inventoryQuantity;
  let producedListener = null;
  const slots = [1, 2].map((slotNumber) => ({
    slotNumber,
    unlocked: true,
    sellItemTypeId: slotNumber === 1 && loadedQuantity > 0 ? 1 : null,
    loadedQuantity: slotNumber === 1 ? loadedQuantity : 0,
    futureItemTypeId: null,
    futurePendingQuantity: 0,
  }));
  let selectedSlotNumber = 1;
  const entityManager = {
    changeSlotFuturePendingQuantity(slotNumber, delta) {
      const slot = slots[slotNumber - 1];
      slot.futurePendingQuantity = Math.max(0, slot.futurePendingQuantity + delta);
      return slot.futurePendingQuantity;
    },
    getSelectedSlotNumber: () => selectedSlotNumber,
    getSlotSnapshots: () => slots.map((slot) => ({ ...slot })),
    setSlotFutureItem(slotNumber, itemTypeId, pendingQuantity = 0) {
      const slot = slots[slotNumber - 1];
      slot.futureItemTypeId = itemTypeId || null;
      slot.futurePendingQuantity = itemTypeId ? pendingQuantity : 0;
      return true;
    },
  };
  const loadSlot = vi.fn((slotNumber, itemTypeId, quantity) => {
    const slot = slots[slotNumber - 1];
    const moved = Math.min(quantity, inventory, 1_000_000 - slot.loadedQuantity);
    if (moved <= 0) return { ok: false, reason: 'not_enough_items' };
    inventory -= moved;
    slot.sellItemTypeId = itemTypeId;
    slot.loadedQuantity += moved;
    return { ok: true, slotNumber, quantity: moved };
  });
  const manager = new ShopShelfFutureLoadManager({
    itemsFacade: {
      getItemDefinition: () => ({ id: 1, key: 'sageSeed', kind: 'seed' }),
      subscribeProducedItems(listener) {
        producedListener = listener;
        return () => { producedListener = null; };
      },
    },
    shopSellKindManager: { isSellKind: (kind) => kind === 'seed' },
    shopShelfEntityManager: entityManager,
    shopShelfSlotSelectionManager: { loadSlot },
    shopSellAvailabilityManager: { getAvailableQuantity: () => inventory },
    getItemAccess: () => ({ tradedHere: true }),
  });
  manager.initialize({ register: vi.fn() });

  return {
    getInventory: () => inventory,
    loadSlot,
    manager,
    produce(quantity) {
      inventory += quantity;
      producedListener?.({ itemTypeId: 1, quantity });
    },
    selectSlot(slotNumber) { selectedSlotNumber = slotNumber; },
    slots,
  };
}

describe('ShopShelfFutureLoadManager', () => {
  it('loads only copies produced after future marking is enabled', () => {
    const harness = createHarness({ inventoryQuantity: 100 });

    expect(harness.manager.setSelectedFutureItem(1, true)).toMatchObject({
      ok: true,
      enabled: true,
    });
    expect(harness.getInventory()).toBe(100);

    harness.produce(5);

    expect(harness.loadSlot).toHaveBeenCalledWith(1, 1, 5);
    expect(harness.getInventory()).toBe(100);
    expect(harness.slots[0]).toMatchObject({
      loadedQuantity: 5,
      futureItemTypeId: 1,
      futurePendingQuantity: 0,
    });
  });

  it('keeps produced copies pending while the stand is full and loads them later', () => {
    const harness = createHarness({ inventoryQuantity: 0, loadedQuantity: 1_000_000 });
    harness.manager.setSelectedFutureItem(1, true);

    harness.produce(3);
    expect(harness.slots[0].futurePendingQuantity).toBe(3);
    expect(harness.manager.hasFrameTimerWork()).toBe(false);

    harness.slots[0].loadedQuantity = 999_998;
    expect(harness.manager.hasFrameTimerWork()).toBe(true);
    harness.manager.flushPendingItems();

    expect(harness.slots[0]).toMatchObject({
      loadedQuantity: 1_000_000,
      futurePendingQuantity: 1,
    });
  });

  it('moves one item future target between stands and clears it when stopped', () => {
    const harness = createHarness({ inventoryQuantity: 0 });
    harness.manager.setSelectedFutureItem(1, true);
    harness.selectSlot(2);
    harness.manager.setSelectedFutureItem(1, true);

    expect(harness.slots[0].futureItemTypeId).toBeNull();
    expect(harness.slots[1].futureItemTypeId).toBe(1);

    harness.manager.setSelectedFutureItem(1, false);
    harness.produce(2);
    expect(harness.loadSlot).not.toHaveBeenCalled();
  });
});

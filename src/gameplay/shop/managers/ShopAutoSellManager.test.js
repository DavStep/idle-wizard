import { describe, expect, it, vi } from 'vitest';
import { ShopAutoSellManager } from './ShopAutoSellManager.js';

const sageSeed = { id: 1, key: 'sageSeed', kind: 'seed', label: 'sage seed' };

function createHarness({
  slots = [
    {
      slotNumber: 1,
      unlocked: true,
      sellItemTypeId: 1,
      loadedQuantity: 3,
      sellProgressSeconds: 0,
    },
  ],
  batchSize = 1,
  npcNeed = 100,
  priceCoin = 4,
} = {}) {
  const slotState = slots.map((slot) => ({ ...slot }));
  const addCoin = vi.fn();
  const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
  const onItemSold = vi.fn();
  const setSlotSellProgressSeconds = vi.fn((slotNumber, seconds) => {
    const slot = slotState.find((candidate) => candidate.slotNumber === slotNumber);
    if (slot) slot.sellProgressSeconds = seconds;
  });
  const changeSlotLoadedQuantity = vi.fn((slotNumber, delta) => {
    const slot = slotState.find((candidate) => candidate.slotNumber === slotNumber);
    if (!slot) return null;
    slot.loadedQuantity = Math.max(0, slot.loadedQuantity + delta);
    if (slot.loadedQuantity === 0) {
      slot.sellItemTypeId = null;
      slot.sellProgressSeconds = 0;
    }
    return slot.loadedQuantity;
  });
  const syncPriceRetention = vi.fn();
  const manager = new ShopAutoSellManager({
    coinFacade: { add: addCoin },
    itemsFacade: {
      getItemDefinition: (id) => (id === sageSeed.id ? sageSeed : null),
      safeGetDefinitionByKey: (key) => (key === sageSeed.key ? sageSeed : null),
    },
    shopBalanceManager: { getAutoSellSeconds: () => 5 },
    shopNpcPriceManager: {
      getNpcBuyPriceCoin: () => priceCoin,
      getNpcNeed: () => npcNeed,
      needsBackendPrices: () => false,
      recordSellToNpc,
      syncPriceRetention,
    },
    shopNpcSellQuoteManager: {
      quoteItem: ({ quantity }) => ({
        ok: true,
        quantity,
        priceCoin,
        totalPriceCoin: quantity * priceCoin,
      }),
    },
    shopShelfEntityManager: {
      changeSlotLoadedQuantity,
      getSlotSnapshots: () => slotState.map((slot) => ({ ...slot })),
      setSlotSellProgressSeconds,
    },
    getAccessibleSlotCount: () => 5,
    getItemAccess: () => ({ tradedHere: true }),
    getStallBatchSize: () => batchSize,
    onItemSold,
  });

  return {
    addCoin,
    changeSlotLoadedQuantity,
    manager,
    onItemSold,
    recordSellToNpc,
    setSlotSellProgressSeconds,
    slotState,
    syncPriceRetention,
  };
}

describe('ShopAutoSellManager', () => {
  it('sells one loaded item from a stand every five seconds', () => {
    const { addCoin, manager, recordSellToNpc, slotState } = createHarness();

    manager.update(4);
    expect(slotState[0].loadedQuantity).toBe(3);
    expect(slotState[0].sellProgressSeconds).toBe(4);

    manager.update(1);
    expect(slotState[0].loadedQuantity).toBe(2);
    expect(slotState[0].sellProgressSeconds).toBe(0);
    expect(addCoin).toHaveBeenCalledWith(4);
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 1);
  });

  it('uses the researched x2 batch without changing the five-second cycle', () => {
    const { addCoin, manager, slotState } = createHarness({ batchSize: 2 });

    manager.update(5);

    expect(slotState[0].loadedQuantity).toBe(1);
    expect(addCoin).toHaveBeenCalledWith(8);
  });

  it('keeps progress independently for every stand', () => {
    const { manager, slotState } = createHarness({
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 2,
          sellProgressSeconds: 4,
        },
        {
          slotNumber: 2,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 2,
          sellProgressSeconds: 1,
        },
      ],
    });

    manager.update(1);

    expect(slotState[0]).toMatchObject({ loadedQuantity: 1, sellProgressSeconds: 0 });
    expect(slotState[1]).toMatchObject({ loadedQuantity: 2, sellProgressSeconds: 2 });
  });

  it('catches up elapsed cycles arithmetically and stops at loaded stock', () => {
    const { addCoin, manager, onItemSold, slotState } = createHarness({ batchSize: 2 });

    manager.update(20);

    expect(slotState[0].loadedQuantity).toBe(0);
    expect(addCoin).toHaveBeenCalledWith(12);
    expect(onItemSold).toHaveBeenCalledTimes(1);
  });

  it('shares current NPC demand across stands and submits one aggregated update', () => {
    const { addCoin, manager, recordSellToNpc, slotState } = createHarness({
      npcNeed: 3,
      batchSize: 2,
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 4,
          sellProgressSeconds: 0,
        },
        {
          slotNumber: 2,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 4,
          sellProgressSeconds: 0,
        },
      ],
    });

    manager.update(5);

    expect(slotState.map((slot) => slot.loadedQuantity)).toEqual([2, 3]);
    expect(addCoin).toHaveBeenNthCalledWith(1, 8);
    expect(addCoin).toHaveBeenNthCalledWith(2, 4);
    expect(recordSellToNpc).toHaveBeenCalledTimes(1);
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 3);
  });

  it('splits aggregated backend reports at the reducer security limit', () => {
    const { manager, recordSellToNpc } = createHarness({
      npcNeed: 20_000,
      batchSize: 2,
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 10_000,
          sellProgressSeconds: 0,
        },
        {
          slotNumber: 2,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 10_000,
          sellProgressSeconds: 0,
        },
      ],
    });

    manager.update(25_000);

    expect(recordSellToNpc).toHaveBeenCalledTimes(2);
    expect(recordSellToNpc).toHaveBeenNthCalledWith(1, sageSeed, 10_000);
    expect(recordSellToNpc).toHaveBeenNthCalledWith(2, sageSeed, 10_000);
  });

  it('keeps a due cycle pending while backend prices are unavailable', () => {
    const { manager, slotState } = createHarness({ priceCoin: null });
    manager.shopNpcPriceManager.needsBackendPrices = () => true;

    manager.update(5);

    expect(slotState[0]).toMatchObject({ loadedQuantity: 3, sellProgressSeconds: 5 });
    expect(manager.hasFrameTimerWork()).toBe(true);
  });

  it('pauses a loaded stand while trader demand is empty', () => {
    const { addCoin, manager, recordSellToNpc, slotState } = createHarness({
      npcNeed: 0,
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
          loadedQuantity: 3,
          sellProgressSeconds: 2,
        },
      ],
    });

    manager.update(4);

    expect(slotState[0]).toMatchObject({
      loadedQuantity: 3,
      sellProgressSeconds: 2,
    });
    expect(addCoin).not.toHaveBeenCalled();
    expect(recordSellToNpc).not.toHaveBeenCalled();
    expect(manager.hasFrameTimerWork()).toBe(true);
  });

  it('retains prices only while at least one loaded stand is active', () => {
    const { manager, slotState, syncPriceRetention } = createHarness();

    manager.update(0);
    slotState[0].loadedQuantity = 0;
    manager.update(0);

    expect(syncPriceRetention).toHaveBeenNthCalledWith(1, true);
    expect(syncPriceRetention).toHaveBeenNthCalledWith(2, false);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { ShopAutoSellManager } from './ShopAutoSellManager.js';

function createSlotManager({
  slots = [
    {
      slotNumber: 1,
      unlocked: true,
      sellItemTypeId: 1,
    },
  ],
  initialProgressSeconds = 0,
} = {}) {
  let progressSeconds = initialProgressSeconds;

  return {
    getSlotSnapshots: () => slots,
    getSellProgressSeconds: () => progressSeconds,
    setSellProgressSeconds: (nextProgressSeconds) => {
      progressSeconds = nextProgressSeconds;
    },
    consumeSlotSellQuantityLimit: (slotNumber, quantity) => {
      const slot = slots.find((candidate) => candidate.slotNumber === slotNumber);

      if (slot?.sellLimitMode !== 'amount') {
        return null;
      }

      slot.sellQuantityLimit = Math.max(0, slot.sellQuantityLimit - quantity);
      return slot.sellQuantityLimit;
    },
  };
}

describe('ShopAutoSellManager', () => {
  it('bulk sells available items at the static NPC price', () => {
    const nowMs = 5_000;
    const addGold = vi.fn();
    const removeItem = vi.fn().mockReturnValue({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 3,
    });
    const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => 3,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        recordSellToNpc,
      },
      shopShelfEntityManager: createSlotManager(),
      now: () => nowMs,
    });

    manager.update(5);

    expect(removeItem).toHaveBeenCalledWith(1, 3);
    expect(addGold).toHaveBeenCalledWith(12);
    expect(recordSellToNpc).toHaveBeenCalledWith(
      {
        id: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      3,
    );
  });

  it('does not sell reserved cauldron quantities', () => {
    let nowMs = 5_000;
    let quantity = 3;
    const addGold = vi.fn();
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      if (quantity < removeQuantity) {
        return null;
      }

      quantity -= removeQuantity;
      return {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: removeQuantity,
      };
    });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1001,
          key: 'sageHerb',
          label: 'sage',
          kind: 'herb',
        }),
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 6,
        recordSellToNpc: vi.fn(),
      },
      shopSellAvailabilityManager: {
        getAvailableQuantity: () => quantity - 2,
        canRemoveItem: (_itemTypeId, removeQuantity) => quantity - 2 >= removeQuantity,
      },
      shopShelfEntityManager: createSlotManager(),
      now: () => nowMs,
    });

    manager.update(5);
    nowMs = 10_000;
    manager.update(5);

    expect(quantity).toBe(2);
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(addGold).toHaveBeenCalledTimes(1);
    expect(addGold).toHaveBeenCalledWith(6);
  });

  it('sells only the marked NPC stand amount and decrements it', () => {
    let nowMs = 5_000;
    let quantity = 5;
    const addGold = vi.fn();
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      quantity -= removeQuantity;
      return {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: removeQuantity,
      };
    });
    const slotManager = createSlotManager({
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
          sellLimitMode: 'amount',
          sellQuantityLimit: 2,
        },
      ],
    });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => quantity,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        getNpcNeed: () => 10,
        recordSellToNpc: vi.fn(),
      },
      shopShelfEntityManager: slotManager,
      now: () => nowMs,
    });

    manager.update(5);

    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(addGold).toHaveBeenCalledWith(8);
    expect(quantity).toBe(3);
    expect(slotManager.getSlotSnapshots()[0].sellQuantityLimit).toBe(0);

    nowMs = 10_000;
    manager.update(5);

    expect(removeItem).toHaveBeenCalledTimes(1);
  });

  it('sells all eligible NPC stands on one shared shop timer', () => {
    let nowMs = 4_000;
    const addGold = vi.fn();
    const quantities = new Map([
      [1, 2],
      [2, 3],
    ]);
    const definitions = new Map([
      [
        1,
        {
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        },
      ],
      [
        2,
        {
          id: 2,
          key: 'mintSeed',
          label: 'mint seed',
          kind: 'seed',
        },
      ],
    ]);
    const removeItem = vi.fn((itemTypeId, quantity) => {
      const availableQuantity = quantities.get(itemTypeId) ?? 0;

      if (availableQuantity < quantity) {
        return null;
      }

      quantities.set(itemTypeId, availableQuantity - quantity);
      return {
        itemTypeId,
        ...definitions.get(itemTypeId),
        quantity,
      };
    });
    const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const slotManager = createSlotManager({
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
        },
        {
          slotNumber: 2,
          unlocked: true,
          sellItemTypeId: 2,
        },
      ],
    });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: (itemTypeId) => definitions.get(itemTypeId),
        getItemQuantity: (itemTypeId) => quantities.get(itemTypeId) ?? 0,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: (item) => (item.id === 1 ? 4 : 7),
        recordSellToNpc,
      },
      shopShelfEntityManager: slotManager,
      now: () => nowMs,
    });

    manager.update(4);

    expect(removeItem).not.toHaveBeenCalled();
    expect(slotManager.getSellProgressSeconds()).toBe(4);

    nowMs = 5_000;
    manager.update(1);

    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(removeItem).toHaveBeenCalledWith(2, 3);
    expect(addGold).toHaveBeenCalledWith(8);
    expect(addGold).toHaveBeenCalledWith(21);
    expect(slotManager.getSellProgressSeconds()).toBe(0);
  });

  it('does not over-submit NPC demand across same-item stands in one timer cycle', () => {
    let nowMs = 5_000;
    let quantity = 10;
    const addGold = vi.fn();
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      quantity -= removeQuantity;
      return {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: removeQuantity,
      };
    });
    const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const slotManager = createSlotManager({
      slots: [
        {
          slotNumber: 1,
          unlocked: true,
          sellItemTypeId: 1,
        },
        {
          slotNumber: 2,
          unlocked: true,
          sellItemTypeId: 1,
        },
      ],
    });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => quantity,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        getNpcNeed: () => 3,
        recordSellToNpc,
      },
      shopShelfEntityManager: slotManager,
      now: () => nowMs,
    });

    manager.update(5);

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(1, 3);
    expect(addGold).toHaveBeenCalledWith(12);
    expect(recordSellToNpc).toHaveBeenCalledTimes(1);
    expect(recordSellToNpc).toHaveBeenCalledWith(
      {
        id: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      3,
    );
  });

  it('does not over-submit NPC demand across catch-up timer cycles', () => {
    const nowMs = 15_000;
    let quantity = 10;
    const addGold = vi.fn();
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      quantity -= removeQuantity;
      return {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: removeQuantity,
      };
    });
    const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => quantity,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        getNpcNeed: () => 3,
        recordSellToNpc,
      },
      shopShelfEntityManager: createSlotManager(),
      now: () => nowMs,
    });

    manager.update(15);

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(1, 3);
    expect(addGold).toHaveBeenCalledWith(12);
    expect(recordSellToNpc).toHaveBeenCalledTimes(1);
  });

  it('syncs the shop timer to global wall-clock boundaries', () => {
    let nowMs = 3_605_000;
    let quantity = 2;
    const addGold = vi.fn();
    const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
      if (quantity < removeQuantity) {
        return null;
      }

      quantity -= removeQuantity;
      return {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: removeQuantity,
      };
    });
    const slotManager = createSlotManager();
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => quantity,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 1_800,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        recordSellToNpc: vi.fn(),
      },
      shopShelfEntityManager: slotManager,
      now: () => nowMs,
    });

    manager.update(600);

    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(addGold).toHaveBeenCalledWith(8);
    expect(slotManager.getSellProgressSeconds()).toBe(5);

    nowMs = 3_610_000;
    manager.update(5);

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(slotManager.getSellProgressSeconds()).toBe(10);
  });

  it('does not sell when backend NPC price is missing', () => {
    let nowMs = 5_000;
    const addGold = vi.fn();
    const removeItem = vi.fn();
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => null,
        recordSellToNpc: vi.fn(),
      },
      shopShelfEntityManager: createSlotManager(),
      now: () => nowMs,
    });

    manager.update(5);

    expect(removeItem).not.toHaveBeenCalled();
    expect(addGold).not.toHaveBeenCalled();
  });

  it('keeps a completed cycle pending until backend NPC prices are ready', () => {
    let nowMs = 5_000;
    let priceGold = null;
    let npcNeed = null;
    const addGold = vi.fn();
    const removeItem = vi.fn().mockReturnValue({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 3,
    });
    const recordSellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: addGold,
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => 3,
        removeItem,
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => priceGold,
        getNpcNeed: () => npcNeed,
        recordSellToNpc,
        syncPriceRetention: vi.fn(),
      },
      shopShelfEntityManager: createSlotManager(),
      now: () => nowMs,
    });

    manager.update(5);

    expect(removeItem).not.toHaveBeenCalled();
    expect(addGold).not.toHaveBeenCalled();

    priceGold = 4;
    npcNeed = 10;
    nowMs = 6_000;
    manager.update(1);

    expect(removeItem).toHaveBeenCalledWith(1, 3);
    expect(addGold).toHaveBeenCalledWith(12);
    expect(recordSellToNpc).toHaveBeenCalledWith(
      {
        id: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      3,
    );
  });

  it('retains backend NPC prices only while a stand has an item selected', () => {
    let slots = [
      {
        slotNumber: 1,
        unlocked: true,
        sellItemTypeId: 1,
      },
    ];
    const syncPriceRetention = vi.fn();
    let progressSeconds = 0;
    const slotManager = {
      getSlotSnapshots: () => slots,
      getSellProgressSeconds: () => progressSeconds,
      setSellProgressSeconds: (nextProgressSeconds) => {
        progressSeconds = nextProgressSeconds;
      },
    };
    const manager = new ShopAutoSellManager({
      goldFacade: {
        add: vi.fn(),
      },
      itemsFacade: {
        getItemDefinition: () => ({
          id: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        }),
        getItemQuantity: () => 0,
        removeItem: vi.fn(),
      },
      shopBalanceManager: {
        getAutoSellSeconds: () => 5,
      },
      shopNpcPriceManager: {
        getNpcBuyPriceGold: () => 4,
        recordSellToNpc: vi.fn(),
        syncPriceRetention,
      },
      shopShelfEntityManager: slotManager,
    });

    manager.update(0);

    slots = [
      {
        slotNumber: 1,
        unlocked: true,
        sellItemTypeId: null,
      },
    ];

    manager.update(0);

    expect(syncPriceRetention).toHaveBeenNthCalledWith(1, true);
    expect(syncPriceRetention).toHaveBeenNthCalledWith(2, false);
  });
});

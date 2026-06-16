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
  };
}

describe('ShopAutoSellManager', () => {
  it('bulk sells available items at the static NPC price', () => {
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
    });

    manager.update(5);
    manager.update(5);

    expect(quantity).toBe(2);
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(addGold).toHaveBeenCalledTimes(1);
    expect(addGold).toHaveBeenCalledWith(6);
  });

  it('sells all eligible NPC stands on one shared shop timer', () => {
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
    });

    manager.update(4);

    expect(removeItem).not.toHaveBeenCalled();
    expect(slotManager.getSellProgressSeconds()).toBe(4);

    manager.update(1);

    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(removeItem).toHaveBeenCalledWith(2, 3);
    expect(addGold).toHaveBeenCalledWith(8);
    expect(addGold).toHaveBeenCalledWith(21);
    expect(slotManager.getSellProgressSeconds()).toBe(0);
  });

  it('does not sell when backend NPC price is missing', () => {
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
    });

    manager.update(5);

    expect(removeItem).not.toHaveBeenCalled();
    expect(addGold).not.toHaveBeenCalled();
  });
});

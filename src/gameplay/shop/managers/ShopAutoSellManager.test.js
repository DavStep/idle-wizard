import { describe, expect, it, vi } from 'vitest';

import { ShopAutoSellManager } from './ShopAutoSellManager.js';

function createSlotManager() {
  let progressSeconds = 0;

  return {
    getSlotSnapshots: () => [
      {
        slotNumber: 1,
        unlocked: true,
        sellItemTypeId: 1,
      },
    ],
    getSellProgressSeconds: () => progressSeconds,
    setSellProgressSeconds: (_slotNumber, nextProgressSeconds) => {
      progressSeconds = nextProgressSeconds;
    },
  };
}

describe('ShopAutoSellManager', () => {
  it('uses dynamic NPC price and records backend sell pressure', () => {
    const addGold = vi.fn();
    const removeItem = vi.fn().mockReturnValue({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
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

    expect(removeItem).toHaveBeenCalledWith(1, 1);
    expect(addGold).toHaveBeenCalledWith(4);
    expect(recordSellToNpc).toHaveBeenCalledWith(
      {
        id: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      1,
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

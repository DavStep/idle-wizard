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
      label: 'Sage Seed',
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
          label: 'Sage Seed',
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
        label: 'Sage Seed',
        kind: 'seed',
      },
      1,
    );
  });
});

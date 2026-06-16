import { describe, expect, it, vi } from 'vitest';

import { ShopDirectSellManager } from './ShopDirectSellManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'sage seed',
  kind: 'seed',
};

function createManager({
  quantity = 5,
  quote = { ok: true, quantity: 2, priceGold: 0.8, totalPriceGold: 1.55 },
  fastSellPercent,
  sellResult = { ok: true },
} = {}) {
  let ownedQuantity = quantity;
  const addGold = vi.fn();
  const addItem = vi.fn((_itemTypeId, addQuantity) => {
    ownedQuantity += addQuantity;
  });
  const removeItem = vi.fn((_itemTypeId, removeQuantity) => {
    if (ownedQuantity < removeQuantity) {
      return null;
    }

    ownedQuantity -= removeQuantity;
    return {
      itemTypeId: sageSeed.id,
      ...sageSeed,
      quantity: removeQuantity,
    };
  });
  const recordSellToNpc = vi.fn().mockResolvedValue(sellResult);
  const onItemSold = vi.fn();
  const manager = new ShopDirectSellManager({
    goldFacade: {
      add: addGold,
    },
    itemsFacade: {
      addItem,
      getItemDefinition: () => sageSeed,
      getItemQuantity: () => ownedQuantity,
      removeItem,
    },
    researchFacade: {
      getFastSellPercent: () => fastSellPercent,
    },
    shopNpcPriceManager: {
      recordSellToNpc,
    },
    shopNpcSellQuoteManager: {
      quoteItem: () => quote,
    },
    onItemSold,
  });

  return {
    addGold,
    addItem,
    manager,
    onItemSold,
    recordSellToNpc,
    removeItem,
  };
}

describe('ShopDirectSellManager', () => {
  it('blocks direct NPC sells above demand before removing inventory', async () => {
    const { manager, recordSellToNpc, removeItem } = createManager({
      quote: { ok: false, reason: 'demand_too_low', need: 1 },
    });

    await expect(manager.sellItem({ itemTypeId: 1, quantity: 2 })).resolves.toMatchObject({
      ok: false,
      reason: 'demand_too_low',
    });
    expect(removeItem).not.toHaveBeenCalled();
    expect(recordSellToNpc).not.toHaveBeenCalled();
  });

  it('sells directly to NPC after backend accepts the trade', async () => {
    const { addGold, manager, onItemSold, recordSellToNpc, removeItem } = createManager();

    await expect(manager.sellItem({ itemTypeId: 1, quantity: 2 })).resolves.toMatchObject({
      ok: true,
      quantity: 2,
      priceGold: 0.64,
      totalPriceGold: 1.24,
      fastSellPercent: 80,
    });
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 2);
    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(addGold).toHaveBeenCalledWith(1.24);
    expect(onItemSold).toHaveBeenCalledWith(
      expect.objectContaining({
        item: sageSeed,
        gold: 1.24,
        quantity: 2,
        source: 'direct_sell',
      }),
    );
  });

  it('raises fast sell payout when research improves the percent', () => {
    const { manager } = createManager({
      fastSellPercent: 95,
      quote: { ok: true, quantity: 1, priceGold: 100, totalPriceGold: 100 },
    });

    expect(manager.quoteItem({ itemTypeId: 1, quantity: 1 })).toMatchObject({
      ok: true,
      priceGold: 95,
      totalPriceGold: 95,
      fastSellPercent: 95,
    });
  });

  it('returns removed inventory when backend sell fails', async () => {
    const { addGold, addItem, manager, recordSellToNpc } = createManager({
      sellResult: { ok: false, reason: 'offline' },
    });

    await expect(manager.sellItem({ itemTypeId: 1, quantity: 2 })).resolves.toMatchObject({
      ok: false,
      reason: 'offline',
    });
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 2);
    expect(addItem).toHaveBeenCalledWith(1, 2);
    expect(addGold).not.toHaveBeenCalled();
  });
});

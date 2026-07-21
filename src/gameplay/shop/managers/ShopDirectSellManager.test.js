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
  quote = { ok: true, quantity: 2, priceCoin: 0.8, totalPriceCoin: 1.55 },
  fastSellPercent,
  sellResult = { ok: true },
} = {}) {
  let ownedQuantity = quantity;
  const addCoin = vi.fn();
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
    coinFacade: {
      add: addCoin,
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
    addCoin,
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
    const { addCoin, manager, onItemSold, recordSellToNpc, removeItem } = createManager();

    await expect(manager.sellItem({ itemTypeId: 1, quantity: 2 })).resolves.toMatchObject({
      ok: true,
      quantity: 2,
      priceCoin: 1,
      totalPriceCoin: 2,
      fastSellPercent: 80,
    });
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 2);
    expect(removeItem).toHaveBeenCalledWith(1, 2);
    expect(addCoin).toHaveBeenCalledWith(2);
    expect(onItemSold).toHaveBeenCalledWith(
      expect.objectContaining({
        item: sageSeed,
        coin: 2,
        quantity: 2,
        source: 'direct_sell',
      }),
    );
  });

  it('raises fast sell payout when research improves the percent', () => {
    const { manager } = createManager({
      fastSellPercent: 95,
      quote: { ok: true, quantity: 1, priceCoin: 100, totalPriceCoin: 100 },
    });

    expect(manager.quoteItem({ itemTypeId: 1, quantity: 1 })).toMatchObject({
      ok: true,
      priceCoin: 95,
      totalPriceCoin: 95,
      fastSellPercent: 95,
    });
  });

  it('returns removed inventory when backend sell fails', async () => {
    const { addCoin, addItem, manager, recordSellToNpc } = createManager({
      sellResult: { ok: false, reason: 'offline' },
    });

    await expect(manager.sellItem({ itemTypeId: 1, quantity: 2 })).resolves.toMatchObject({
      ok: false,
      reason: 'offline',
    });
    expect(recordSellToNpc).toHaveBeenCalledWith(sageSeed, 2);
    expect(addItem).toHaveBeenCalledWith(1, 2);
    expect(addCoin).not.toHaveBeenCalled();
  });
});

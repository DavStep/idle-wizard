import { describe, expect, it, vi } from 'vitest';

import { ShopStockPurchaseManager } from './ShopStockPurchaseManager.js';
import { ShopStockPriceQuoteManager } from './ShopStockPriceQuoteManager.js';

const sageSeed = {
  id: 1,
  key: 'sageSeed',
  label: 'Sage Seed',
  kind: 'seed',
};

describe('ShopStockPurchaseManager', () => {
  it('buys one item from shared NPC stock after backend success', async () => {
    const spend = vi.fn().mockReturnValue(true);
    const addItem = vi.fn();
    const recordBuyFromNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopStockPurchaseManager({
      goldFacade: {
        canSpend: () => true,
        spend,
      },
      itemsFacade: {
        getItemDefinition: () => sageSeed,
        addItem,
      },
      shopNpcPriceManager: {
        getNpcSellPriceGold: () => 1.205,
        getNpcStock: () => 3,
        recordBuyFromNpc,
      },
    });

    await expect(manager.buyItem({ itemTypeId: 1 })).resolves.toMatchObject({
      ok: true,
      item: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
      },
      quantity: 1,
      priceGold: 1.21,
      totalPriceGold: 1.21,
    });
    expect(recordBuyFromNpc).toHaveBeenCalledWith(sageSeed, 1);
    expect(spend).toHaveBeenCalledWith(1.21);
    expect(addItem).toHaveBeenCalledWith(1, 1);
  });

  it('does not spend gold when backend stock buy fails', async () => {
    const spend = vi.fn();
    const addItem = vi.fn();
    const manager = new ShopStockPurchaseManager({
      goldFacade: {
        canSpend: () => true,
        spend,
      },
      itemsFacade: {
        getItemDefinition: () => sageSeed,
        addItem,
      },
      shopNpcPriceManager: {
        getNpcSellPriceGold: () => 2,
        getNpcStock: () => 1,
        recordBuyFromNpc: () => Promise.resolve({ ok: false, reason: 'empty_stock' }),
      },
    });

    await expect(manager.buyItem({ itemTypeId: 1 })).resolves.toEqual({
      ok: false,
      reason: 'empty_stock',
    });
    expect(spend).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
  });

  it('spends the marginal quote for batch stock buys', async () => {
    const spend = vi.fn().mockReturnValue(true);
    const addItem = vi.fn();
    const recordBuyFromNpc = vi.fn().mockResolvedValue({ ok: true });
    const shopNpcPriceManager = {
      getNpcSellPriceGold: () => 1.2,
      getNpcStock: () => 2000,
      getNpcPrice: () => ({
        basePriceGold: 1,
        npcNeed: 1000,
        targetNeed: 1000,
        maxNeed: 2000,
      }),
      recordBuyFromNpc,
    };
    const manager = new ShopStockPurchaseManager({
      goldFacade: {
        canSpend: () => true,
        spend,
      },
      itemsFacade: {
        getItemDefinition: () => sageSeed,
        addItem,
      },
      shopNpcPriceManager,
      shopStockPriceQuoteManager: new ShopStockPriceQuoteManager({
        shopNpcPriceManager,
      }),
    });

    const result = await manager.buyItem({ itemTypeId: 1, quantity: 1000 });

    expect(result.ok).toBe(true);
    expect(result.totalPriceGold).toBeGreaterThan(1.2 * 1000);
    expect(recordBuyFromNpc).toHaveBeenCalledWith(sageSeed, 1000);
    expect(spend).toHaveBeenCalledWith(result.totalPriceGold);
    expect(addItem).toHaveBeenCalledWith(1, 1000);
  });
});

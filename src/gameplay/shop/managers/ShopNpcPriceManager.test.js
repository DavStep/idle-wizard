import { describe, expect, it, vi } from 'vitest';

import { ShopBalanceManager } from './ShopBalanceManager.js';
import { ShopNpcPriceManager } from './ShopNpcPriceManager.js';

const sageSeed = {
  key: 'sageSeed',
  kind: 'seed',
};

describe('ShopNpcPriceManager', () => {
  it('falls back to static shop balance when backend price is missing', () => {
    const manager = new ShopNpcPriceManager({
      shopBalanceManager: new ShopBalanceManager(),
    });

    expect(manager.getNpcBuyPriceGold(sageSeed)).toBe(1);
  });

  it('uses backend NPC buy price when available', () => {
    const manager = new ShopNpcPriceManager({
      shopBalanceManager: new ShopBalanceManager(),
      npcMarketFacade: {
        getNpcBuyPriceGold: () => 7,
      },
    });

    expect(manager.getNpcBuyPriceGold(sageSeed)).toBe(7);
  });

  it('records NPC sell pressure through the backend facade', async () => {
    const sellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopNpcPriceManager({
      shopBalanceManager: new ShopBalanceManager(),
      npcMarketFacade: {
        sellToNpc,
      },
    });

    await expect(manager.recordSellToNpc(sageSeed, 3)).resolves.toEqual({ ok: true });
    expect(sellToNpc).toHaveBeenCalledWith({
      itemKey: 'sageSeed',
      quantity: 3,
    });
  });
});

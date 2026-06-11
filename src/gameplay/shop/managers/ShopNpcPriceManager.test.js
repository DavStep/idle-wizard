import { describe, expect, it, vi } from 'vitest';

import { ShopNpcPriceManager } from './ShopNpcPriceManager.js';

const sageSeed = {
  key: 'sageSeed',
  kind: 'seed',
};

describe('ShopNpcPriceManager', () => {
  it('returns no NPC buy price when backend price is missing', () => {
    const manager = new ShopNpcPriceManager();

    expect(manager.getNpcBuyPriceGold(sageSeed)).toBeNull();
  });

  it('uses backend NPC buy price when available', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceGold: () => 7,
      },
    });

    expect(manager.getNpcBuyPriceGold(sageSeed)).toBe(7);
  });

  it('uses backend NPC need when available', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcNeed: () => 12,
      },
    });

    expect(manager.getNpcNeed(sageSeed)).toBe(12);
  });

  it('requires backend price and positive need before selling to NPC', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceGold: () => 7,
        getNpcNeed: () => 12,
      },
    });

    expect(manager.canSellToNpc(sageSeed)).toBe(true);

    const missingNeedManager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceGold: () => 7,
      },
    });

    expect(missingNeedManager.canSellToNpc(sageSeed)).toBe(false);

    const emptyNeedManager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceGold: () => 7,
        getNpcNeed: () => 0,
      },
    });

    expect(emptyNeedManager.canSellToNpc(sageSeed)).toBe(false);
  });

  it('records NPC sell pressure through the backend facade', async () => {
    const sellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopNpcPriceManager({
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

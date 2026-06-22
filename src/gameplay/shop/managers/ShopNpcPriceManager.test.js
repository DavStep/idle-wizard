import { describe, expect, it, vi } from 'vitest';

import { ShopNpcPriceManager } from './ShopNpcPriceManager.js';

const sageSeed = {
  key: 'sageSeed',
  label: 'sage seed',
  kind: 'seed',
  baseSellPrice: 1,
};

function createPlayerLevelFacade(level) {
  return {
    getSnapshot: () => ({
      currentLevel: level,
    }),
  };
}

describe('ShopNpcPriceManager', () => {
  it('returns no NPC buy price when backend price is missing', () => {
    const manager = new ShopNpcPriceManager();

    expect(manager.getNpcBuyPriceCoin(sageSeed)).toBeNull();
  });

  it('uses backend NPC buy price when available', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
      },
    });

    expect(manager.getNpcBuyPriceCoin(sageSeed)).toBe(7);
  });

  it('uses fake NPC demand and prices before level 4', async () => {
    const sellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const buyFromNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopNpcPriceManager({
      playerLevelFacade: createPlayerLevelFacade(3),
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
        getNpcSellPriceCoin: () => 9,
        getNpcNeed: () => 12,
        getNpcStock: () => 4,
        sellToNpc,
        buyFromNpc,
      },
    });

    expect(manager.getNpcPrice(sageSeed)).toBeNull();
    expect(manager.getNpcBuyPriceCoin(sageSeed)).toBe(1);
    expect(manager.getNpcSellPriceCoin(sageSeed)).toBeNull();
    expect(manager.getNpcNeed(sageSeed)).toBe(1000);
    expect(manager.getNpcStock(sageSeed)).toBeNull();

    await expect(manager.recordSellToNpc(sageSeed, 3)).resolves.toMatchObject({
      ok: true,
      fake: true,
    });
    await expect(manager.recordBuyFromNpc(sageSeed, 2)).resolves.toMatchObject({
      ok: true,
      fake: true,
    });
    expect(sellToNpc).not.toHaveBeenCalled();
    expect(buyFromNpc).not.toHaveBeenCalled();
  });

  it('uses backend NPC demand and prices from level 4', async () => {
    const sellToNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopNpcPriceManager({
      playerLevelFacade: createPlayerLevelFacade(4),
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
        getNpcNeed: () => 12,
        sellToNpc,
      },
    });

    expect(manager.getNpcBuyPriceCoin(sageSeed)).toBe(7);
    expect(manager.getNpcNeed(sageSeed)).toBe(12);

    await expect(manager.recordSellToNpc(sageSeed, 3)).resolves.toEqual({ ok: true });
    expect(sellToNpc).toHaveBeenCalledWith({
      itemKey: 'sageSeed',
      quantity: 3,
    });
  });

  it('retains backend price data only when real NPC market prices are needed', () => {
    let level = 4;
    const releasePrices = vi.fn();
    const retainPrices = vi.fn(() => releasePrices);
    const manager = new ShopNpcPriceManager({
      playerLevelFacade: {
        getSnapshot: () => ({
          currentLevel: level,
        }),
      },
      npcMarketFacade: {
        retainPrices,
      },
    });

    manager.syncPriceRetention(true);
    manager.syncPriceRetention(true);

    expect(retainPrices).toHaveBeenCalledTimes(1);
    expect(releasePrices).not.toHaveBeenCalled();

    level = 3;
    manager.syncPriceRetention(true);

    expect(releasePrices).toHaveBeenCalledTimes(1);

    manager.syncPriceRetention(false);

    expect(releasePrices).toHaveBeenCalledTimes(1);
  });

  it('keeps decimal NPC buy prices to cents', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 0.805,
      },
    });

    expect(manager.getNpcBuyPriceCoin(sageSeed)).toBe(0.81);
  });

  it('uses backend NPC need when available', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcNeed: () => 12,
      },
    });

    expect(manager.getNpcNeed(sageSeed)).toBe(12);
  });

  it('uses backend NPC stock when available', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getPrice: () => ({
          npcStock: 9,
        }),
      },
    });

    expect(manager.getNpcStock(sageSeed)).toBe(9);
  });

  it('requires backend price and positive need before selling to NPC', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
        getNpcNeed: () => 12,
      },
    });

    expect(manager.canSellToNpc(sageSeed)).toBe(true);

    const missingNeedManager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
      },
    });

    expect(missingNeedManager.canSellToNpc(sageSeed)).toBe(false);

    const emptyNeedManager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcBuyPriceCoin: () => 7,
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

  it('requires backend sell price and stock before buying from NPC', () => {
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        getNpcSellPriceCoin: () => 9,
        getPrice: () => ({
          npcStock: 2,
        }),
      },
    });

    expect(manager.canBuyFromNpc(sageSeed, 2)).toBe(true);
    expect(manager.canBuyFromNpc(sageSeed, 3)).toBe(false);
  });

  it('records NPC buy pressure through the backend facade', async () => {
    const buyFromNpc = vi.fn().mockResolvedValue({ ok: true });
    const manager = new ShopNpcPriceManager({
      npcMarketFacade: {
        buyFromNpc,
      },
    });

    await expect(manager.recordBuyFromNpc(sageSeed, 2)).resolves.toEqual({ ok: true });
    expect(buyFromNpc).toHaveBeenCalledWith({
      itemKey: 'sageSeed',
      quantity: 2,
    });
  });
});

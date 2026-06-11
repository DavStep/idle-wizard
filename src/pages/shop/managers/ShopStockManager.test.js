/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { ShopStockManager } from './ShopStockManager.js';

function createGameplayFacade(snapshot) {
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    quoteNpcMarketStockPurchase: vi.fn((itemTypeId, quantity = 1) => {
      const item = snapshot.shop.stock.items.find(
        (stockItem) => stockItem.itemTypeId === itemTypeId,
      );

      return {
        ok: true,
        quantity,
        priceGold: item.buyGold,
        totalPriceGold: quantity === 2 ? 2.6 : item.buyGold * quantity,
      };
    }),
    buyNpcMarketStockItem: vi.fn().mockResolvedValue({
      ok: true,
      item: snapshot.shop.stock.items[0],
      quantity: 1,
      priceGold: snapshot.shop.stock.items[0].buyGold,
      totalPriceGold: snapshot.shop.stock.items[0].buyGold,
    }),
  };
}

describe('ShopStockManager', () => {
  it('renders shared NPC stock with bottom tabs and a quantity buy dialog', async () => {
    const stage = document.createElement('section');
    const snapshot = {
      gold: { current: 5 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        stock: {
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 0,
              buyGold: 1.25,
              stock: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopStockManager({ gameplayFacade });

    manager.mount(stage);

    expect(stage.querySelector('.shop-page__stock')?.textContent).toContain(
      'npc stock market',
    );
    expect(stage.querySelector('.shop-page__stock-row')?.textContent).toContain(
      'Sage Seed (3)',
    );
    expect(stage.querySelector('.shop-page__stock-buy-button')?.textContent).toBe(
      'buy 1.25 gold',
    );
    expect(
      stage.querySelector('.shop-page__stock')?.lastElementChild,
    ).toBe(stage.querySelector('.shop-page__stock-tabs'));

    await manager.onBuyItem(1);

    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(false);
    expect(gameplayFacade.buyNpcMarketStockItem).not.toHaveBeenCalled();
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total1.25 gold',
    );

    const input = stage.querySelector('.shop-page__stock-buy-input');
    input.value = '2';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketStockPurchase).toHaveBeenLastCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-dialog')?.textContent).toContain(
      'total2.60 gold',
    );

    await manager.onConfirmBuy();

    expect(gameplayFacade.buyNpcMarketStockItem).toHaveBeenCalledWith(1, 2);
    expect(stage.querySelector('.shop-page__stock-buy-popup')?.hidden).toBe(true);

    manager.unmount();
  });
});

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
  it('renders shared NPC stock below the NPC market with a one-item buy action', async () => {
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
      'market stock',
    );
    expect(stage.querySelector('.shop-page__stock-row')?.textContent).toContain(
      'Sage Seed (3)',
    );
    expect(stage.querySelector('.shop-page__stock-buy-button')?.textContent).toBe(
      'buy 1.25 gold',
    );

    await manager.onBuyItem(1);

    expect(gameplayFacade.buyNpcMarketStockItem).toHaveBeenCalledWith(1, 1);

    manager.unmount();
  });
});

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { ShopDirectSellManager } from './ShopDirectSellManager.js';

function createGameplayFacade(snapshot) {
  const listeners = new Set();
  const quoteNpcMarketSell = vi.fn((itemTypeId, quantity = 1) => {
    const item = snapshot.shop.shelf.sellItems.find(
      (sellItem) => sellItem.itemTypeId === itemTypeId,
    );

    if (!item) {
      return { ok: false, reason: 'missing_price' };
    }

    if (quantity > item.sellNeed) {
      return {
        ok: false,
        reason: 'demand_too_low',
        quantity,
        need: item.sellNeed,
      };
    }

    return {
      ok: true,
      quantity,
      priceGold: item.fastSellGold,
      totalPriceGold: quantity === 2 ? 2.08 : item.fastSellGold * quantity,
      fastSellPercent: item.fastSellPercent,
    };
  });
  const sellNpcMarketItem = vi.fn(async (itemTypeId, quantity) => {
    const item = snapshot.shop.shelf.sellItems.find(
      (sellItem) => sellItem.itemTypeId === itemTypeId,
    );

    item.quantity -= quantity;

    for (const listener of listeners) {
      listener(snapshot);
    }

    return { ok: true, item, quantity, totalPriceGold: 2.6 };
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    quoteNpcMarketSell,
    sellNpcMarketItem,
  };
}

describe('ShopDirectSellManager', () => {
  it('opens fast sell, recalculates totals, and blocks sales above NPC need', async () => {
    const buttonParent = document.createElement('section');
    const popupParent = document.createElement('section');
    const snapshot = {
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        shelf: {
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              quantity: 5,
              sellGold: 1.4,
              fastSellGold: 1.12,
              fastSellPercent: 80,
              sellNeed: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopDirectSellManager({ gameplayFacade });

    manager.mount({ buttonParent, popupParent });

    const openButton = buttonParent.querySelector('.shop-page__direct-sell-button');
    expect(openButton?.textContent).toBe('fast sell');
    expect(openButton?.dataset.tutorialId).toBe('shop:directSell');

    openButton.click();

    const popup = popupParent.querySelector('.shop-page__direct-sell-popup');
    expect(popup?.hidden).toBe(false);
    expect(popup?.textContent).toContain('fast sell');
    expect(popup?.textContent).toContain('select item');

    const itemButton = popup.querySelector('.shop-page__direct-sell-item-button');
    itemButton.click();

    expect(itemButton.getAttribute('aria-pressed')).toBe('true');
    expect(itemButton.dataset.directSellItemKey).toBe('sageSeed');
    expect(popup.textContent).toContain('each1.12 gold');
    expect(popup.textContent).toContain('need3');
    expect(popup.textContent).toContain('total1.12 gold');

    const input = popup.querySelector('.shop-page__direct-sell-input');
    input.value = '4';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 4);
    expect(popup.textContent).toContain('demand too low');
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.disabled).toBe(true);
    expect(popup.textContent).toContain('total?');

    input.value = '2';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 2);
    expect(popup.textContent).toContain('total2.08 gold');
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.disabled).toBe(
      false,
    );

    await manager.onConfirmSell();

    expect(gameplayFacade.sellNpcMarketItem).toHaveBeenCalledWith(1, 2);
    expect(popup.hidden).toBe(true);

    manager.unmount();
  });
});

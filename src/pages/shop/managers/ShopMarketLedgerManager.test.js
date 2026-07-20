/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { ShopMarketLedgerManager } from './ShopMarketLedgerManager.js';

function createGameplayFacade(snapshot) {
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listener(snapshot);
      return () => {};
    },
    quoteNpcMarketStockPurchase(itemTypeId, quantity) {
      const item = snapshot.shop.stock.items.find(
        (candidate) => candidate.itemTypeId === itemTypeId,
      );
      return item?.tradedHere !== false && item?.stock >= quantity
        ? {
            ok: true,
            quantity,
            priceCoin: item.buyCoin,
            totalPriceCoin: item.buyCoin * quantity,
          }
        : { ok: false, reason: 'market_locked' };
    },
    buyNpcMarketStockItem: vi.fn().mockResolvedValue({ ok: true }),
  };
}

describe('ShopMarketLedgerManager', () => {
  it('shows concise help and a ranked, tabbed price catalogue', () => {
    const buttonParent = document.createElement('section');
    const popupParent = document.createElement('section');
    const snapshot = {
      coin: { current: 100 },
      research: { completedResearchIds: [] },
      shop: {
        market: { id: 'smallTown', name: 'Small Town Market', rank: 1 },
        stock: {
          items: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'sage seed',
              kind: 'seed',
              researched: true,
              quantity: 2,
              tradedHere: true,
              marketPriceCoin: 10,
              sellCoin: 8,
              buyCoin: 12,
              sellNeed: 7,
              stock: 4,
              priceHistory: [
                { marketPriceCoin: 8, updatedAtMs: 1 },
                { marketPriceCoin: 9, updatedAtMs: 2 },
              ],
            },
            {
              itemTypeId: 21,
              key: 'belladonnaSeed',
              label: 'belladonna seed',
              kind: 'seed',
              researched: true,
              quantity: 1,
              tradedHere: false,
              requiredMarket: {
                id: 'arcaneExchange',
                name: 'Arcane Exchange',
                rank: 5,
              },
            },
          ],
        },
      },
    };
    const manager = new ShopMarketLedgerManager({
      gameplayFacade: createGameplayFacade(snapshot),
    });

    manager.mount({ buttonParent, popupParent });

    const helpButton = buttonParent.querySelector('.shop-page__ledger-help-button');
    expect(helpButton?.textContent).toBe('[i]');
    helpButton.click();
    expect(buttonParent.querySelector('.shop-page__ledger-help')?.textContent).toBe(
      'compare trader prices, stock, buyers, and recent changes.',
    );

    buttonParent.querySelector('.shop-page__ledger-open')?.click();
    const popup = popupParent.querySelector('.shop-page__ledger-popup');
    expect(popup?.hidden).toBe(false);
    expect(popup?.querySelector('.style-box__title')?.textContent).toBe(
      'small town market ledger',
    );
    expect(
      [...popup.querySelectorAll('.shop-page__ledger-tab')].map((button) => button.textContent),
    ).toEqual(['seeds', 'herbs', 'potions']);

    const rows = [...popup.querySelectorAll('.shop-page__ledger-item-row')];
    expect(rows[0].textContent).toContain('sage seed');
    expect(rows[0].textContent).toContain('↑ +2 coin / 2h');
    expect(rows[1].textContent).toContain('not traded');
    expect(rows[1].textContent).toContain('arcane exchange ★★★★★');

    rows[0].click();
    expect(popup.querySelector('.shop-page__ledger-facts')?.textContent).toContain(
      'buyers want 7',
    );
    expect(
      [...popup.querySelectorAll('.shop-page__ledger-history > div')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(['now10 coin', '1h9 coin', '2h8 coin', '3h—']);

    manager.unmount();
  });

  it('buys trader stock from the selected ledger entry', async () => {
    const buttonParent = document.createElement('section');
    const popupParent = document.createElement('section');
    const snapshot = {
      coin: { current: 100 },
      research: { completedResearchIds: [] },
      shop: {
        market: { id: 'smallTown', name: 'Small Town Market', rank: 1 },
        stock: {
          items: [{
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            researched: true,
            quantity: 0,
            tradedHere: true,
            marketPriceCoin: 10,
            sellCoin: 8,
            buyCoin: 12,
            sellNeed: 0,
            stock: 3,
            priceHistory: [],
          }],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopMarketLedgerManager({ gameplayFacade });
    manager.mount({ buttonParent, popupParent });
    buttonParent.querySelector('.shop-page__ledger-open')?.click();

    popupParent.querySelector('.shop-page__ledger-item-row')?.click();
    expect(popupParent.querySelector('.shop-page__ledger-facts')?.textContent).toContain(
      'no buyers',
    );
    popupParent.querySelector('.shop-page__ledger-buy')?.click();
    popupParent.querySelector('.shop-page__stock-buy-confirm')?.click();
    await Promise.resolve();

    expect(gameplayFacade.buyNpcMarketStockItem).toHaveBeenCalledWith(1, 1);
    manager.unmount();
  });
});

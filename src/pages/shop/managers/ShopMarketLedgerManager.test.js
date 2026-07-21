/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
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
  it('spaces price-history blocks apart and leaves a zero trend unsigned', () => {
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
            quantity: 2,
            tradedHere: true,
            marketPriceCoin: 10,
            sellCoin: 8,
            buyCoin: 12,
            sellNeed: 7,
            stock: 4,
            priceHistory: [
              { hourKey: '7', marketPriceCoin: 10, updatedAtMs: 7 * 3_600_000 },
            ],
          }],
        },
      },
    };
    const manager = new ShopMarketLedgerManager({
      gameplayFacade: createGameplayFacade(snapshot),
      now: () => 10 * 3_600_000,
    });

    manager.mount({ buttonParent, popupParent });
    buttonParent.querySelector('.shop-page__ledger-open')?.click();

    const trend = popupParent.querySelector(
      '.shop-page__ledger-item-row > span:last-child',
    )?.textContent;
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const historyRule = baseCss.match(
      /\.shop-page__ledger-history\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(trend).toBe('0 / 3h');
    expect(historyRule).toMatch(/\bgap:\s*6px;/);

    manager.unmount();
  });

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
                { hourKey: '7', marketPriceCoin: 8, updatedAtMs: 7 * 3_600_000 },
                { hourKey: '9', marketPriceCoin: 9, updatedAtMs: 9 * 3_600_000 },
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
            {
              itemTypeId: 101,
              key: 'sage',
              label: 'sage',
              kind: 'herb',
              researched: true,
              quantity: 2,
              tradedHere: true,
              marketPriceCoin: 15,
              sellCoin: 12,
              buyCoin: 18,
              sellNeed: 3,
              stock: 2,
              priceHistory: [],
            },
          ],
        },
      },
    };
    const manager = new ShopMarketLedgerManager({
      gameplayFacade: createGameplayFacade(snapshot),
      now: () => 10 * 3_600_000,
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
    expect(rows[0].textContent).toContain('↑ +2 coin / 3h');
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
    ).toEqual(['now10 coin', '1h9 coin', '2h—', '3h8 coin']);

    popup.querySelector('[role="tab"]:nth-child(2)')?.click();
    expect(rows[0].hidden).toBe(true);
    const herbRow = popup.querySelector('[data-shop-ledger-item-key="sage"]');
    expect(herbRow?.hidden).toBe(false);
    expect(herbRow?.textContent).toContain('sage');

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

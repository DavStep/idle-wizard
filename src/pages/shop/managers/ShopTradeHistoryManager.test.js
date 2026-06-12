// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { ShopTradeHistoryManager } from './ShopTradeHistoryManager.js';

function createPlayerShopFacadeFake() {
  const snapshot = {
    connected: true,
    tradeHistory: [
      {
        tradeId: 'trade-global-1',
        buyerUsername: 'Merlin',
        sellerUsername: 'Ada',
        itemLabel: 'mint seed',
        quantity: 2,
        priceGold: 4,
        totalPriceGold: 8,
      },
      {
        tradeId: 'trade-own-1',
        buyerUsername: 'wizard',
        sellerUsername: 'Ada',
        itemLabel: 'sage seed',
        quantity: 1,
        priceGold: 3,
        totalPriceGold: 3,
      },
    ],
    ownTradeHistory: [
      {
        tradeId: 'trade-own-1',
        buyerUsername: 'wizard',
        sellerUsername: 'Ada',
        itemLabel: 'sage seed',
        quantity: 1,
        priceGold: 3,
        totalPriceGold: 3,
      },
    ],
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listener(snapshot);
      return () => {};
    },
  };
}

describe('ShopTradeHistoryManager', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('shows own and global trade history tabs', () => {
    const stage = document.createElement('section');
    const actions = document.createElement('div');
    const popupParent = document.createElement('div');
    const manager = new ShopTradeHistoryManager({
      playerShopFacade: createPlayerShopFacadeFake(),
    });

    stage.append(actions, popupParent);
    document.body.append(stage);
    manager.mount({ buttonParent: actions, popupParent });

    const button = actions.querySelector('.shop-page__trade-history-button');
    const popup = popupParent.querySelector('.shop-page__trade-history-popup');

    expect(button?.textContent).toBe('trade history');
    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(
      popup.querySelector('.shop-page__trade-history-dialog')?.nextElementSibling,
    ).toBe(popup.querySelector('.shop-page__trade-history-tabs'));
    expect(
      [...popup.querySelectorAll('.shop-page__trade-history-tab-button')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(['own', 'global']);
    expect(popup.textContent).toContain('wizard bought sage seed from Ada for 3 gold');
    expect(popup.textContent).not.toContain('Merlin bought 2 mint seed');

    [...popup.querySelectorAll('.shop-page__trade-history-tab-button')]
      .find((tab) => tab.textContent === 'global')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.textContent).toContain('Merlin bought 2 mint seed from Ada for 8 gold');

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popup.hidden).toBe(true);

    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    popup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(popup.hidden).toBe(true);

    manager.unmount();
  });
});

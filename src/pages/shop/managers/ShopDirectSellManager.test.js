/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { ShopDirectSellManager } from './ShopDirectSellManager.js';

function setElementMetrics(
  element,
  {
    clientWidth,
    clientHeight,
    offsetWidth,
    offsetHeight,
    rect,
  },
) {
  if (clientWidth !== undefined) {
    Object.defineProperty(element, 'clientWidth', {
      configurable: true,
      get: () => clientWidth,
    });
  }

  if (clientHeight !== undefined) {
    Object.defineProperty(element, 'clientHeight', {
      configurable: true,
      get: () => clientHeight,
    });
  }

  if (offsetWidth !== undefined) {
    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      get: () => offsetWidth,
    });
  }

  if (offsetHeight !== undefined) {
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      get: () => offsetHeight,
    });
  }

  if (rect) {
    element.getBoundingClientRect = () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      toJSON: () => rect,
    });
  }
}

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

    const box = buttonParent.querySelector('.shop-page__direct-sell-box');
    const openButton = buttonParent.querySelector('.shop-page__direct-sell-button');
    const helpButton = buttonParent.querySelector('.shop-page__direct-sell-help-button');
    const helpPopup = popupParent.querySelector('.shop-page__direct-sell-help-popup');
    const helpTooltip = popupParent.querySelector('.shop-page__direct-sell-help-tooltip');
    expect(box?.querySelector('.style-box__title')?.textContent).toBe('fast sell');
    expect(box?.querySelector('.shop-page__direct-sell-summary')?.textContent).toBe(
      'instant sale80% payout',
    );
    expect(openButton?.textContent).toBe('fast sell');
    expect(openButton?.dataset.tutorialId).toBe('shop:directSell');
    expect(helpButton?.textContent).toBe('?');
    expect(helpPopup?.hidden).toBe(true);

    helpButton.click();

    expect(helpButton?.getAttribute('aria-expanded')).toBe('true');
    expect(helpPopup?.hidden).toBe(false);
    expect(helpTooltip?.textContent).toContain('80% of full npc price');
    expect(helpTooltip?.textContent).toContain('wait for the timer');

    openButton.click();

    expect(helpButton?.getAttribute('aria-expanded')).toBe('false');
    expect(helpPopup?.hidden).toBe(true);

    const popup = popupParent.querySelector('.shop-page__direct-sell-popup');
    expect(popup?.hidden).toBe(false);
    expect(popup?.textContent).toContain('fast sell');
    expect(popup?.textContent).toContain('no item selected');
    expect(popup?.textContent).toContain('select item');
    expect(popup.querySelector('.shop-page__direct-sell-field')?.hidden).toBe(true);
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.hidden).toBe(true);

    const itemRow = popup.querySelector('.shop-page__direct-sell-row');
    const itemButton = popup.querySelector('.shop-page__direct-sell-item-button');
    expect(itemRow).toBe(itemButton);
    expect(itemButton.dataset.tutorialId).toBeUndefined();
    expect(itemButton.querySelector('.row_key')?.dataset.tutorialId).toBeUndefined();
    expect(
      itemButton.querySelector('.shop-page__direct-sell-target-label')?.dataset.tutorialId,
    ).toBe(
      'shop:directSell:sageSeed',
    );
    expect(itemButton.querySelector('.row_val')?.dataset.tutorialId).toBeUndefined();

    itemButton
      .querySelector('.row_val')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(itemButton.getAttribute('aria-pressed')).toBe('true');
    expect(itemButton.dataset.directSellItemKey).toBe('sageSeed');
    expect(popup.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed (5)1.12 gold',
    );
    expect(popup.querySelector('.shop-page__direct-sell-field')?.hidden).toBe(false);
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.hidden).toBe(false);
    expect(popup.textContent).toContain('total1.12 gold');

    const incrementButton = [...popup.querySelectorAll('.shop-page__direct-sell-step')].find(
      (button) => button.textContent === '+1',
    );
    incrementButton.click();

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 2);
    expect(popup.querySelector('.amount-selection-row__value')?.textContent).toBe('2');
    expect(popup.textContent).toContain('total2.08 gold');

    const herbsTab = [...popup.querySelectorAll('.shop-page__direct-sell-tab-button')].find(
      (button) => button.textContent === 'herbs',
    );
    herbsTab.click();

    expect(popup.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed (5)1.12 gold',
    );

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

  it('keeps help tooltip inside the scaled popup layer on web', () => {
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

    const helpButton = buttonParent.querySelector('.shop-page__direct-sell-help-button');
    const helpPopup = popupParent.querySelector('.shop-page__direct-sell-help-popup');
    const helpTooltip = popupParent.querySelector('.shop-page__direct-sell-help-tooltip');

    setElementMetrics(helpPopup, {
      clientWidth: 300,
      clientHeight: 500,
      offsetWidth: 300,
      offsetHeight: 500,
      rect: {
        left: 0,
        top: 0,
        right: 450,
        bottom: 750,
        width: 450,
        height: 750,
      },
    });
    setElementMetrics(helpTooltip, {
      clientWidth: 150,
      clientHeight: 120,
      offsetWidth: 150,
      offsetHeight: 120,
      rect: {
        left: 0,
        top: 0,
        right: 225,
        bottom: 180,
        width: 225,
        height: 180,
      },
    });
    setElementMetrics(helpButton, {
      rect: {
        left: 408,
        top: 120,
        right: 438,
        bottom: 150,
        width: 30,
        height: 30,
      },
    });

    helpButton.click();

    expect(helpPopup.hidden).toBe(false);
    expect(helpTooltip.style.left).toBe('142px');
    expect(helpTooltip.style.top).toBe('106px');

    manager.unmount();
  });

  it('resets the popup amount to one when reopened', () => {
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
              sellNeed: 5,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopDirectSellManager({ gameplayFacade });

    manager.mount({ buttonParent, popupParent });

    const openButton = buttonParent.querySelector('.shop-page__direct-sell-button');
    openButton?.click();

    const itemButton = popupParent.querySelector('.shop-page__direct-sell-item-button');
    itemButton?.click();

    const incrementButton = [...popupParent.querySelectorAll('.shop-page__direct-sell-step')].find(
      (button) => button.textContent === '+1',
    );
    incrementButton?.click();

    expect(
      popupParent.querySelector('.amount-selection-row__value')?.textContent,
    ).toBe('2');

    popupParent.querySelector('.shop-page__direct-sell-close')?.click();
    openButton?.click();

    expect(
      popupParent.querySelector('.amount-selection-row__value')?.textContent,
    ).toBe('1');

    manager.unmount();
  });

  it('lets the tutorial override the confirm action without calling NPC sell', async () => {
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
              quantity: 2,
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
    const onSellOverride = vi.fn(async () => ({
      handled: true,
      ok: true,
      gold: 10,
    }));
    const manager = new ShopDirectSellManager({
      gameplayFacade,
      onSellOverride,
    });

    manager.mount({ buttonParent, popupParent });

    buttonParent.querySelector('.shop-page__direct-sell-button')?.click();
    popupParent.querySelector('.shop-page__direct-sell-item-button')?.click();

    await manager.onConfirmSell();

    expect(onSellOverride).toHaveBeenCalledWith({
      item: expect.objectContaining({
        itemTypeId: 1,
        key: 'sageSeed',
      }),
      quantity: 1,
      quote: expect.objectContaining({
        ok: true,
        quantity: 1,
      }),
    });
    expect(gameplayFacade.sellNpcMarketItem).not.toHaveBeenCalled();
    expect(popupParent.querySelector('.shop-page__direct-sell-popup')?.hidden).toBe(true);

    manager.unmount();
  });

  it('uses a quote override for tutorial fast-sell display text', () => {
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
              quantity: 2,
              sellGold: 0.44,
              fastSellGold: 0.35,
              fastSellPercent: 80,
              sellNeed: 3,
            },
          ],
        },
      },
    };
    const gameplayFacade = createGameplayFacade(snapshot);
    const manager = new ShopDirectSellManager({
      gameplayFacade,
      getSellQuoteOverride: vi.fn(() => ({
        ok: true,
        quantity: 1,
        priceGold: 10,
        totalPriceGold: 10,
        tutorial: true,
      })),
    });

    manager.mount({ buttonParent, popupParent });

    buttonParent.querySelector('.shop-page__direct-sell-button')?.click();

    const itemButton = popupParent.querySelector('.shop-page__direct-sell-item-button');
    expect(itemButton?.textContent).toContain('10 gold');

    itemButton?.click();

    expect(popupParent.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed (2)10 gold',
    );
    expect(popupParent.querySelector('.shop-page__direct-sell-value-row')?.textContent).toBe(
      'total10 gold',
    );

    manager.unmount();
  });
});

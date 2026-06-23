/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { describe, expect, it, vi } from 'vitest';

import { ShopDirectSellManager } from './ShopDirectSellManager.js';

function createTouchStartEvent() {
  return new window.Event('touchstart', { bubbles: true, cancelable: true });
}

function withPointerEvent(callback) {
  const previousPointerEvent = window.PointerEvent;
  window.PointerEvent = function PointerEvent() {};

  try {
    callback();
  } finally {
    if (previousPointerEvent === undefined) {
      delete window.PointerEvent;
    } else {
      window.PointerEvent = previousPointerEvent;
    }
  }
}

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
      priceCoin: item.fastSellCoin,
      totalPriceCoin: quantity === 2 ? 2.08 : item.fastSellCoin * quantity,
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

    return { ok: true, item, quantity, totalPriceCoin: 2.6 };
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
  it('keeps fast-sell item names normal weight until selected', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const unselectedRule = baseCss.match(
      /\.shop-page__direct-sell-rows\s+\.shop-page__direct-sell-item-button:not\(\[aria-pressed="true"\]\)\s+\.row_key,\s*\.shop-page__direct-sell-rows\s+\.shop-page__direct-sell-item-button:not\(\[aria-pressed="true"\]\)\s+\.shop-page__direct-sell-target-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const selectedRule = baseCss.match(
      /\.shop-page__direct-sell-rows\s+\.shop-page__direct-sell-item-button\[aria-pressed="true"\]\s+\.shop-page__direct-sell-target-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(unselectedRule).toBeDefined();
    expect(unselectedRule).toMatch(/\bfont-weight:\s*normal;/);
    expect(selectedRule).toBeDefined();
    expect(selectedRule).toMatch(/\bfont-weight:\s*700;/);
  });

  it('formats empty demand as no buyers', () => {
    const manager = new ShopDirectSellManager();

    expect(manager.formatDemandText({ sellNeed: 0 })).toBe('no buyers');
    expect(manager.getSellFailureText('demand_too_low', { need: 0 })).toBe('no buyers');
    expect(manager.getSellFailureText('demand_too_low', { need: 2 })).toBe('only 2 buyers');
  });

  it('opens fast sell, recalculates totals, and clamps sales to trader need', async () => {
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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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
    expect(helpTooltip?.textContent).toContain('80% of full trader price');
    expect(helpTooltip?.textContent).toContain('wait for the timer');

    openButton.click();

    expect(helpButton?.getAttribute('aria-expanded')).toBe('false');
    expect(helpPopup?.hidden).toBe(true);

    const popup = popupParent.querySelector('.shop-page__direct-sell-popup');
    expect(popup?.hidden).toBe(false);
    expect(popup?.textContent).toContain('fast sell');
    expect(popup?.textContent).toContain('no item selected');
    expect(popup?.textContent).toContain('select item');
    expect(popup.querySelector('.shop-page__direct-sell-field')?.hidden).toBe(false);
    expect(popup.querySelector('.amount-selection-row__value')?.textContent).toBe('1');
    expect(popup.querySelector('.amount-selection-row__value')?.hasAttribute('disabled')).toBe(
      true,
    );
    expect(
      [...popup.querySelectorAll('.shop-page__direct-sell-step')].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.hidden).toBe(false);
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.disabled).toBe(true);
    expect(
      popup.querySelector('.shop-page__direct-sell-confirm-label')?.textContent,
    ).toBe('sell x1');
    expect(
      popup.querySelector('.shop-page__direct-sell-confirm-value')?.textContent,
    ).toBe('');

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
    expect(
      popup.querySelector('.shop-page__direct-sell-selected-label')?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(popup.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed x5demand 3',
    );
    expect(popup.querySelector('.shop-page__direct-sell-field')?.hidden).toBe(false);
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.hidden).toBe(false);
    const confirmButton = popup.querySelector('.shop-page__direct-sell-confirm');
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-label')?.textContent).toBe(
      'sell x1',
    );
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-value')?.textContent).toBe(
      '1.12 coin',
    );
    expect(popup.textContent).not.toContain('total1.12 coin');

    const incrementButton = [...popup.querySelectorAll('.shop-page__direct-sell-step')].find(
      (button) => button.textContent === '+1',
    );
    expect(incrementButton.dataset.tutorialId).toBe('shop:directSell:amount:+1');
    incrementButton.click();

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 2);
    expect(popup.querySelector('.amount-selection-row__value')?.textContent).toBe('2');
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-label')?.textContent).toBe(
      'sell x2',
    );
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-value')?.textContent).toBe(
      '2.08 coin',
    );

    const herbsTab = [...popup.querySelectorAll('.shop-page__direct-sell-tab-button')].find(
      (button) => button.textContent === 'herbs',
    );
    expect(herbsTab.dataset.tutorialId).toBe('shop:directSell:tab:herb');
    herbsTab.click();

    expect(popup.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed x5demand 3',
    );

    const input = popup.querySelector('.shop-page__direct-sell-input');
    input.value = '4';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 3);
    expect(popup.textContent).not.toContain('demand too low');
    expect(popup.querySelector('.amount-selection-row__value')?.textContent).toBe('3');
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.disabled).toBe(false);
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-label')?.textContent).toBe(
      'sell x3',
    );
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-value')?.textContent).toBe(
      '3.36 coin',
    );

    input.value = '2';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(gameplayFacade.quoteNpcMarketSell).toHaveBeenLastCalledWith(1, 2);
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-label')?.textContent).toBe(
      'sell x2',
    );
    expect(confirmButton?.querySelector('.shop-page__direct-sell-confirm-value')?.textContent).toBe(
      '2.08 coin',
    );
    expect(popup.querySelector('.shop-page__direct-sell-confirm')?.disabled).toBe(
      false,
    );

    await manager.onConfirmSell();

    expect(gameplayFacade.sellNpcMarketItem).toHaveBeenCalledWith(1, 2);
    expect(popup.hidden).toBe(true);

    manager.unmount();
  });

  it('selects a fast-sell item on touchstart of the item name', () => {
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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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
    const onSelectItemSpy = vi.spyOn(manager, 'onSelectItem');
    buttonParent.querySelector('.shop-page__direct-sell-button')?.click();

    const itemName = popupParent.querySelector('.shop-page__direct-sell-target-label');
    itemName?.dispatchEvent(createTouchStartEvent());
    itemName?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onSelectItemSpy).toHaveBeenCalledTimes(1);
    expect(
      popupParent.querySelector('.shop-page__direct-sell-selected-row')?.textContent,
    ).toBe('sage seed x5demand 3');
    expect(
      popupParent.querySelector('.shop-page__direct-sell-item-button')?.getAttribute('aria-pressed'),
    ).toBe('true');

    manager.unmount();
  });

  it('selects a fast-sell item from touchstart on the visible seed text when PointerEvent exists', () => {
    withPointerEvent(() => {
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
                sellCoin: 1.4,
                fastSellCoin: 1.12,
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
      buttonParent.querySelector('.shop-page__direct-sell-button')?.click();

      const visibleSeedText = popupParent.querySelector(
        '.shop-page__direct-sell-target-label .style-seed-label__text',
      );
      visibleSeedText?.dispatchEvent(createTouchStartEvent());

      expect(
        popupParent.querySelector('.shop-page__direct-sell-selected-row')?.textContent,
      ).toBe('sage seed x5demand 3');
      expect(
        popupParent.querySelector('.shop-page__direct-sell-item-button')?.getAttribute(
          'aria-pressed',
        ),
      ).toBe('true');

      manager.unmount();
    });
  });

  it('deselects the selected fast-sell item from the list row and top name', () => {
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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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

    buttonParent.querySelector('.shop-page__direct-sell-button')?.click();

    const itemButton = popupParent.querySelector('.shop-page__direct-sell-item-button');
    const selectedLabel = popupParent.querySelector('.shop-page__direct-sell-selected-label');
    const quantityField = popupParent.querySelector('.shop-page__direct-sell-field');
    const confirmButton = popupParent.querySelector('.shop-page__direct-sell-confirm');

    itemButton?.click();

    expect(itemButton?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedLabel?.textContent).toBe('sage seed x5');
    expect(selectedLabel?.getAttribute('aria-pressed')).toBe('true');
    expect(quantityField?.hidden).toBe(false);
    expect(confirmButton?.hidden).toBe(false);

    itemButton?.click();

    expect(itemButton?.getAttribute('aria-pressed')).toBe('false');
    expect(selectedLabel?.textContent).toBe('no item selected');
    expect(selectedLabel?.getAttribute('aria-pressed')).toBe('false');
    expect(selectedLabel?.hasAttribute('disabled')).toBe(true);
    expect(quantityField?.hidden).toBe(false);
    expect(quantityField?.querySelector('.amount-selection-row__value')?.textContent).toBe('1');
    expect(
      [...(quantityField?.querySelectorAll('.shop-page__direct-sell-step') ?? [])].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    expect(confirmButton?.hidden).toBe(false);
    expect(confirmButton?.disabled).toBe(true);

    itemButton?.click();

    expect(itemButton?.getAttribute('aria-pressed')).toBe('true');
    expect(selectedLabel?.getAttribute('aria-pressed')).toBe('true');

    selectedLabel?.click();

    expect(itemButton?.getAttribute('aria-pressed')).toBe('false');
    expect(selectedLabel?.textContent).toBe('no item selected');
    expect(selectedLabel?.getAttribute('aria-pressed')).toBe('false');
    expect(selectedLabel?.hasAttribute('disabled')).toBe(true);
    expect(quantityField?.hidden).toBe(false);
    expect(quantityField?.querySelector('.amount-selection-row__value')?.textContent).toBe('1');
    expect(confirmButton?.hidden).toBe(false);
    expect(confirmButton?.disabled).toBe(true);

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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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
              sellCoin: 1.4,
              fastSellCoin: 1.12,
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
      coin: 10,
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
              sellCoin: 0.44,
              fastSellCoin: 0.35,
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
        priceCoin: 10,
        totalPriceCoin: 10,
        tutorial: true,
      })),
    });

    manager.mount({ buttonParent, popupParent });

    buttonParent.querySelector('.shop-page__direct-sell-button')?.click();

    const itemButton = popupParent.querySelector('.shop-page__direct-sell-item-button');
    expect(itemButton?.textContent).toContain('10 coin');

    itemButton?.click();

    expect(popupParent.querySelector('.shop-page__direct-sell-selected-row')?.textContent).toBe(
      'sage seed x2demand 3',
    );
    expect(
      popupParent.querySelector('.shop-page__direct-sell-confirm-label')?.textContent,
    ).toBe('sell x1');
    expect(
      popupParent.querySelector('.shop-page__direct-sell-confirm-value')?.textContent,
    ).toBe(
      '10 coin',
    );

    manager.unmount();
  });
});

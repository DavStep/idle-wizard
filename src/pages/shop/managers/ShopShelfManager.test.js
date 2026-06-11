/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopMarketTabsManager } from './ShopMarketTabsManager.js';
import { ShopPlayerShelfManager } from './ShopPlayerShelfManager.js';
import { ShopPlayerRequestManager } from './ShopPlayerRequestManager.js';
import { ShopShelfManager } from './ShopShelfManager.js';

describe('ShopShelfManager', () => {
  it('switches between npm and player market panels', () => {
    const stage = document.createElement('section');
    const manager = new ShopMarketTabsManager();

    manager.mount(stage);

    const npmPanel = manager.getPanel('npm');
    const playerPanel = manager.getPanel('player');
    const playerTab = [...stage.querySelectorAll('.shop-page__market-tab-button')].find(
      (button) => button.textContent === 'player market',
    );

    expect(npmPanel.hidden).toBe(false);
    expect(playerPanel.hidden).toBe(true);

    playerTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(npmPanel.hidden).toBe(true);
    expect(playerPanel.hidden).toBe(false);
    expect(playerTab.getAttribute('aria-selected')).toBe('true');

    manager.unmount();
  });

  it('stores one local player market request', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const manager = new ShopPlayerRequestManager();

    manager.mount(stage, popupLayer);

    stage
      .querySelector('.shop-page__player-request-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    const [itemInput, quantityInput, goldInput] =
      popup.querySelectorAll('.shop-page__request-input');
    itemInput.value = 'Mint Seed';
    quantityInput.value = '2';
    goldInput.value = '3.25';

    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      'requestMint Seed (2) 3.25 gold',
    );

    stage
      .querySelectorAll('.shop-page__player-request-button')[1]
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      'requestnone',
    );

    manager.unmount();
  });

  it('shows zero-cost NPC market stand buys as free', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('shows NPC market quantities while hiding demand from stand and picker labels', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        shelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 1,
              sellGold: 8,
              sellNeed: 919,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 1,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'Sage Seed',
              sellQuantity: 1,
              sellGold: 8,
              sellNeed: 919,
            },
          ],
        },
      },
    };
    const gameplayFacade = {
      subscribe(callback) {
        callback(gameplaySnapshot);
        return () => {};
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const standValue = stage.querySelector('.shop-page__slot-row .row_val');
    const itemButton = [...popupLayer.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent.includes('Sage Seed'),
    );

    expect(standValue?.textContent).toBe('Sage Seed (1) 8.00 gold');
    expect(itemButton?.textContent).toBe('Sage Seed (1) 8.00 gold');
    expect(standValue?.textContent).not.toContain('919');
    expect(itemButton?.textContent).not.toContain('919');
    expect(manager.canSelectSellItem(gameplaySnapshot, gameplaySnapshot.shop.shelf.sellItems[0]))
      .toBe(true);

    manager.unmount();
  });

  it('shows empty player market stand notifications as orange', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        playerShelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [
            {
              itemTypeId: 1,
              key: 'sageSeed',
              label: 'Sage Seed',
              kind: 'seed',
              quantity: 1,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              itemTypeId: null,
            },
          ],
        },
      },
    };
    const gameplayFacade = {
      subscribe(callback) {
        callback(gameplaySnapshot);
        return () => {};
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
      applyPlayerShopMarketSlotQuantity() {},
    };
    const playerShopSnapshot = {
      connected: true,
      listings: [],
      ownListings: [],
      proceedsGold: 0,
    };
    const playerShopFacade = {
      subscribe(callback) {
        callback(playerShopSnapshot);
        return () => {};
      },
      getSnapshot() {
        return playerShopSnapshot;
      },
    };
    const manager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });

    manager.mount(stage, popupLayer);

    const row = stage.querySelector('.shop-page__player-slot-row');
    expect(row?.dataset.notification).toBe('true');
    expect(row?.dataset.notificationTone).toBe('orange');

    manager.unmount();
  });
});

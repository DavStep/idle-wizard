/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopMarketTabsManager } from './ShopMarketTabsManager.js';
import { ShopPlayerShelfManager } from './ShopPlayerShelfManager.js';
import { ShopPlayerRequestManager } from './ShopPlayerRequestManager.js';
import { ShopShelfManager } from './ShopShelfManager.js';

function createRequestGameplayFacadeFake() {
  const snapshot = {
    research: {
      completedResearchIds: [
        'unlockSeed:sageSeed',
        'unlockSeed:mintSeed',
        'unlockRecipe:manaTonic',
      ],
    },
    shop: {
      playerShelf: {
        maxSlots: 5,
        nextSlotNumber: 3,
        nextSlotLockedByLevel: true,
        nextSlotRequiresLevel: 5,
        sellKinds: [
          { kind: 'seed', label: 'seeds' },
          { kind: 'herb', label: 'herbs' },
          { kind: 'potion', label: 'potions' },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            quantity: 0,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            quantity: 4,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'mana tonic',
            kind: 'potion',
            quantity: 0,
          },
        ],
        slots: [
          { slotNumber: 1, unlocked: true },
          { slotNumber: 2, unlocked: true },
          { slotNumber: 3, unlocked: false },
          { slotNumber: 4, unlocked: false },
          { slotNumber: 5, unlocked: false },
        ],
      },
    },
  };

  return {
    subscribe(callback) {
      callback(snapshot);
      return () => {};
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

describe('ShopShelfManager', () => {
  it('switches between npc and player market panels', () => {
    const stage = document.createElement('section');
    const manager = new ShopMarketTabsManager();

    manager.mount(stage);

    const npcPanel = manager.getPanel('npm');
    const playerPanel = manager.getPanel('player');
    const crystalsPanel = manager.getPanel('crystals');
    expect(
      [...stage.querySelectorAll('.shop-page__market-tab-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['npc market', 'player market', 'crystals']);
    const playerTab = [...stage.querySelectorAll('.shop-page__market-tab-button')].find(
      (button) => button.textContent === 'player market',
    );

    expect(npcPanel.hidden).toBe(false);
    expect(playerPanel.hidden).toBe(true);
    expect(crystalsPanel.hidden).toBe(true);

    playerTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(npcPanel.hidden).toBe(true);
    expect(playerPanel.hidden).toBe(false);
    expect(playerTab.getAttribute('aria-selected')).toBe('true');

    manager.unmount();
  });

  it('stores local player market requests by slot', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const manager = new ShopPlayerRequestManager({
      gameplayFacade: createRequestGameplayFacadeFake(),
    });

    manager.mount(stage, popupLayer);

    const requestRows = stage.querySelectorAll('.shop-page__player-request-row');
    expect([...requestRows].map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.shop-page__request-row-item')?.textContent,
      row.querySelector('.shop-page__request-row-price')?.textContent,
    ])).toEqual([
      ['1.', 'empty request', 'request item'],
      ['2.', 'empty request', 'request item'],
      ['3.', 'empty request', 'level 5'],
      ['4.', 'empty request', 'locked'],
      ['5.', 'empty request', 'locked'],
    ]);

    requestRows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    const mintButton = [...popup.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'mint seed (4)',
    );
    mintButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const [quantityInput, goldInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '2';
    goldInput.value = '3.25';

    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.mint seed (2) 3.25 gold',
    );

    requestRows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    [...popup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (0)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    quantityInput.value = '1';
    goldInput.value = '1';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.sage seed (1) 1 gold',
    );
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.mint seed (2) 3.25 gold',
    );

    stage
      .querySelectorAll('.shop-page__player-request-button')[1]
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const clearedRequestRow = stage.querySelector('.shop-page__player-request-row');
    expect(clearedRequestRow?.querySelector('.shop-page__request-row-item')?.textContent).toBe(
      'empty request',
    );
    expect(clearedRequestRow?.querySelector('.shop-page__request-row-price')?.textContent).toBe(
      'request item',
    );
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.mint seed (2) 3.25 gold',
    );

    manager.unmount();
  });

  it('deselects a player market request item when selected again', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const manager = new ShopPlayerRequestManager({
      gameplayFacade: createRequestGameplayFacadeFake(),
    });

    manager.mount(stage, popupLayer);
    stage
      .querySelector('.shop-page__player-request-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    const sageButton = [...popup.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'sage seed (0)',
    );
    const selectedValue = popup.querySelector('.shop-page__request-selected-value');
    const placeButton = popup.querySelector('.shop-page__request-place-button');

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedValue.textContent).toBe('sage seed');
    expect(sageButton.getAttribute('aria-pressed')).toBe('true');
    expect(placeButton.disabled).toBe(false);

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedValue.textContent).toBe('none');
    expect(sageButton.getAttribute('aria-pressed')).toBe('false');
    expect(placeButton.disabled).toBe(true);

    manager.unmount();
  });

  it('uses bottom tabs for player request item categories', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const manager = new ShopPlayerRequestManager({
      gameplayFacade: createRequestGameplayFacadeFake(),
    });

    manager.mount(stage, popupLayer);
    stage
      .querySelector('.shop-page__player-request-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    const dialog = popup.querySelector('.shop-page__request-dialog');
    const tabs = popup.querySelector('.shop-page__request-tabs');
    const tabLabels = [...tabs.querySelectorAll('.shop-page__request-tab-button')].map(
      (button) => button.textContent,
    );

    expect(tabLabels).toEqual(['seeds', 'herbs', 'potions']);
    expect(dialog.nextElementSibling).toBe(tabs);
    expect(
      [...popup.querySelectorAll('.shop-page__player-request-item-row')]
        .filter((row) => !row.hidden)
        .map((row) => row.textContent),
    ).toEqual(['sage seed (0)', 'mint seed (4)']);

    [...tabs.querySelectorAll('.shop-page__request-tab-button')]
      .find((button) => button.textContent === 'herbs')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...popup.querySelectorAll('.shop-page__player-request-item-row')]
        .filter((row) => !row.hidden)
        .map((row) => row.textContent),
    ).toEqual(['sage (2)']);

    manager.unmount();
  });

  it('shows zero-cost NPC market stand buys as free', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('formats NPC market stand buy costs as compact gold text', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 1000)).toBe(
      'buy (1k gold)',
    );
  });

  it('labels empty NPC market stands by lock state', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        shelf: {
          maxSlots: 5,
          selectedSlotNumber: 1,
          nextSlotNumber: 2,
          nextSlotLockedByLevel: true,
          nextSlotRequiresLevel: 3,
          slotCosts: [0, 1, 3, 6, 10],
          sellKinds: [],
          sellItems: [],
          slots: [
            { slotNumber: 1, unlocked: true },
            { slotNumber: 2, unlocked: false },
            { slotNumber: 3, unlocked: false },
            { slotNumber: 4, unlocked: false },
            { slotNumber: 5, unlocked: false },
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

    const rows = [...stage.querySelectorAll('.shop-page__slot-row')];
    expect(rows.map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.shop-page__slot-item-value')?.textContent,
      row.querySelector('.shop-page__slot-price-value')?.textContent,
    ])).toEqual([
      ['1.', 'select', ''],
      ['2.', 'empty stand', 'level 3'],
      ['3.', 'empty stand', 'locked'],
      ['4.', 'empty stand', 'locked'],
      ['5.', 'empty stand', 'locked'],
    ]);
    expect(rows[0].querySelector('.shop-page__slot-empty-rule')).not.toBeNull();

    manager.unmount();
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
    );
  });

  it('formats player market stand buy costs as compact gold text', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 1000)).toBe(
      'buy (1k gold)',
    );
  });

  it('labels empty player market stands by lock state', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        playerShelf: {
          maxSlots: 5,
          selectedSlotNumber: 1,
          nextSlotNumber: 2,
          nextSlotLockedByLevel: true,
          nextSlotRequiresLevel: 3,
          slotCosts: [0, 1, 3, 6, 10],
          sellKinds: [],
          sellItems: [],
          slots: [
            { slotNumber: 1, unlocked: true },
            { slotNumber: 2, unlocked: false },
            { slotNumber: 3, unlocked: false },
            { slotNumber: 4, unlocked: false },
            { slotNumber: 5, unlocked: false },
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
    const manager = new ShopPlayerShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const rows = [...stage.querySelectorAll('.shop-page__player-slot-row')];
    expect(rows.map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.shop-page__slot-item-value')?.textContent,
      row.querySelector('.shop-page__slot-price-value')?.textContent,
    ])).toEqual([
      ['1.', 'empty stand', 'select'],
      ['2.', 'empty stand', 'level 3'],
      ['3.', 'empty stand', 'locked'],
      ['4.', 'empty stand', 'locked'],
      ['5.', 'empty stand', 'locked'],
    ]);

    manager.unmount();
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
              label: 'sage seed',
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
              sellItemTypeId: null,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'sage seed',
              sellQuantity: 1,
              sellGold: null,
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
      (button) => button.textContent.includes('sage seed'),
    );

    expect(standValue?.textContent).toBe('sage seed (1) 8 gold');
    expect(itemButton?.textContent).toBe('sage seed (1) 8 gold');
    expect(standValue?.textContent).not.toContain('919');
    expect(itemButton?.textContent).not.toContain('919');
    expect(manager.canSelectSellItem(gameplaySnapshot, gameplaySnapshot.shop.shelf.sellItems[0]))
      .toBe(true);

    manager.unmount();
  });

  it('shows offline in selected NPC market stand value when price is missing', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockRecipe:manaTonic'] },
      shop: {
        shelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'potion', label: 'potions' }],
          sellItems: [
            {
              itemTypeId: 2001,
              key: 'manaTonic',
              label: 'mana tonic',
              kind: 'potion',
              quantity: 0,
              sellGold: null,
              sellNeed: null,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 2001,
              sellKind: 'potion',
              sellKey: 'manaTonic',
              sellLabel: 'mana tonic',
              sellQuantity: 0,
              sellGold: null,
              sellNeed: null,
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
    const priceValue = stage.querySelector('.shop-page__slot-price-value');

    expect(standValue?.textContent).toBe('mana tonic (0) offline');
    expect(priceValue?.getAttribute('data-resource-color')).toBeNull();

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
              label: 'sage seed',
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

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
            label: 'Sage Seed',
            kind: 'seed',
            quantity: 0,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'Mint Seed',
            kind: 'seed',
            quantity: 4,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'Sage',
            kind: 'herb',
            quantity: 2,
          },
          {
            itemTypeId: 2001,
            key: 'manaTonic',
            label: 'Mana Tonic',
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
    expect([...requestRows].map((row) => row.textContent)).toEqual([
      '1.request item',
      '2.request item',
      '3.empty requestlevel 5',
      '4.empty requestlocked',
      '5.empty requestlocked',
    ]);

    requestRows[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    const mintButton = [...popup.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'Mint Seed (4)',
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
      '2.Mint Seed (2) 3.25 gold',
    );

    requestRows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    [...popup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'Sage Seed (0)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    quantityInput.value = '1';
    goldInput.value = '1';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.Sage Seed (1) 1 gold',
    );
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.Mint Seed (2) 3.25 gold',
    );

    stage
      .querySelectorAll('.shop-page__player-request-button')[1]
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.request item',
    );
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.Mint Seed (2) 3.25 gold',
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
      (button) => button.textContent === 'Sage Seed (0)',
    );
    const selectedValue = popup.querySelector('.shop-page__request-selected-value');
    const placeButton = popup.querySelector('.shop-page__request-place-button');

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(selectedValue.textContent).toBe('Sage Seed');
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
    ).toEqual(['Sage Seed (0)', 'Mint Seed (4)']);

    [...tabs.querySelectorAll('.shop-page__request-tab-button')]
      .find((button) => button.textContent === 'herbs')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...popup.querySelectorAll('.shop-page__player-request-item-row')]
        .filter((row) => !row.hidden)
        .map((row) => row.textContent),
    ).toEqual(['Sage (2)']);

    manager.unmount();
  });

  it('shows zero-cost NPC market stand buys as free', () => {
    const manager = new ShopShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
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
    expect(rows.map((row) => row.textContent)).toEqual([
      '1.select',
      '2.empty standlevel 3',
      '3.empty standlocked',
      '4.empty standlocked',
      '5.empty standlocked',
    ]);

    manager.unmount();
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'buy (free)',
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
    expect(rows.map((row) => row.textContent)).toEqual([
      '1.select',
      '2.empty standlevel 3',
      '3.empty standlocked',
      '4.empty standlocked',
      '5.empty standlocked',
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
              sellItemTypeId: null,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'Sage Seed',
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
      (button) => button.textContent.includes('Sage Seed'),
    );

    expect(standValue?.textContent).toBe('Sage Seed (1) 8 gold');
    expect(itemButton?.textContent).toBe('Sage Seed (1) 8 gold');
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
              label: 'Mana Tonic',
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
              sellLabel: 'Mana Tonic',
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

    expect(standValue?.textContent).toBe('Mana Tonic (0) offline');
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

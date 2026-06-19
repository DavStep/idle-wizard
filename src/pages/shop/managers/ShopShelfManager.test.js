/* @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { describe, expect, it, vi } from 'vitest';

import { ShopMarketTabsManager } from './ShopMarketTabsManager.js';
import { ShopPlayerShelfManager } from './ShopPlayerShelfManager.js';
import { ShopPlayerRequestManager } from './ShopPlayerRequestManager.js';
import { ShopShelfManager } from './ShopShelfManager.js';

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

function flushPromises() {
  return Promise.resolve().then(() => Promise.resolve());
}

function createRequestGameplayFacadeFake() {
  const listeners = new Set();
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
      playerRequests: {
        maxSlots: 5,
        nextSlotNumber: 3,
        nextSlotLockedByLevel: true,
        nextSlotRequiresLevel: 5,
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

  const publish = () => {
    for (const listener of listeners) {
      listener(snapshot);
    }
  };
  const getRequestItem = (itemTypeId) =>
    snapshot.shop.playerShelf.sellItems.find((item) => item.itemTypeId === itemTypeId);
  const getRequestSlot = (slotNumber) =>
    snapshot.shop.playerRequests.slots.find((slot) => slot.slotNumber === slotNumber);

  return {
    subscribe(callback) {
      listeners.add(callback);
      callback(snapshot);
      return () => listeners.delete(callback);
    },
    getSnapshot() {
      return snapshot;
    },
    setPlayerShopRequest(slotNumber, { itemTypeId, quantity, priceGold }) {
      const slot = getRequestSlot(slotNumber);
      const item = getRequestItem(itemTypeId);

      if (!slot?.unlocked || !item) {
        return { ok: false, reason: 'slot_locked' };
      }

      Object.assign(slot, {
        itemTypeId: item.itemTypeId,
        itemKey: item.key,
        itemKind: item.kind,
        itemLabel: item.label,
        quantity,
        priceGold,
      });
      publish();
      return { ok: true, slotNumber, item, quantity, priceGold };
    },
    clearPlayerShopRequest(slotNumber) {
      const slot = getRequestSlot(slotNumber);

      if (!slot?.unlocked) {
        return { ok: false, reason: 'slot_locked' };
      }

      delete slot.itemTypeId;
      delete slot.itemKey;
      delete slot.itemKind;
      delete slot.itemLabel;
      delete slot.quantity;
      delete slot.priceGold;
      publish();
      return { ok: true, slotNumber };
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
    expect(requestRows[0].getAttribute('aria-pressed')).toBe('true');
    expect(requestRows[0].classList.contains('is-selected')).toBe(false);
    expect(
      [...stage.querySelectorAll('.shop-page__player-request-button')].map(
        (button) => button.textContent,
      ),
    ).not.toContain('request');

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
      .querySelector('.shop-page__player-request-clear-button')
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

  it('keeps local player market requests across page remounts', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const manager = new ShopPlayerRequestManager({
      gameplayFacade: createRequestGameplayFacadeFake(),
    });

    manager.mount(stage, popupLayer);
    stage
      .querySelector('.shop-page__player-request-row')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    [...popup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'mint seed (4)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const [quantityInput, goldInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '3';
    goldInput.value = '2.5';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (3) 2.5 gold',
    );

    manager.unmount();
    manager.mount(stage, popupLayer);

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (3) 2.5 gold',
    );

    manager.unmount();
  });

  it('publishes player market requests when backend requests are available', async () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const playerShopFacade = {
      getSnapshot: () => ({ connected: true }),
      setSlotRequest: vi.fn(async () => ({ ok: true })),
      clearSlotRequest: vi.fn(async () => ({ ok: true })),
    };
    const manager = new ShopPlayerRequestManager({
      gameplayFacade: createRequestGameplayFacadeFake(),
      playerShopFacade,
    });

    manager.mount(stage, popupLayer);
    stage
      .querySelector('.shop-page__player-request-row')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__request-popup');
    [...popup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'mint seed (4)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const [quantityInput, goldInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '4';
    goldInput.value = '3.25';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(playerShopFacade.setSlotRequest).toHaveBeenCalledWith({
      slotNumber: 1,
      itemKey: 'mintSeed',
      itemLabel: 'mint seed',
      itemKind: 'seed',
      quantity: 4,
      priceGold: 3.25,
    });
    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (4) 3.25 gold',
    );

    stage
      .querySelector('.shop-page__player-request-clear-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(playerShopFacade.clearSlotRequest).toHaveBeenCalledWith(1);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.empty requestrequest item',
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
      .querySelector('.shop-page__player-request-row')
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
      .querySelector('.shop-page__player-request-row')
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
      'free',
    );
  });

  it('keeps NPC market free stand buys clear of the demand border action', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const firstSlotRule = baseCss.match(
      /\.shop-page__shelf > \.shop-page__slot-row:first-of-type\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const unlockButtonRule = baseCss.match(
      /\.shop-page__slot-unlock-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rowTouchRule = baseCss.match(
      /@media \(hover: none\)\s*\{(?<body>[^{}]*\.shop-page__player-request-row\.shop-page__slot-row--interactive\s*\n\s*\.shop-page__request-row-item[^{}]*)\{/,
    )?.groups?.body;

    expect(firstSlotRule).toBeDefined();
    expect(firstSlotRule).toMatch(
      /margin-top:\s*calc\(\s*var\(--style-box-border-label-line-height\) \+ var\(--style-row-column-gap\)\s*\);/,
    );
    expect(unlockButtonRule).toBeDefined();
    expect(unlockButtonRule).toMatch(/\bdisplay:\s*grid;/);
    expect(unlockButtonRule).toMatch(/\bgrid-column:\s*1 \/ -1;/);
    expect(unlockButtonRule).toMatch(/\btouch-action:\s*manipulation;/);
    expect(rowTouchRule).toBeDefined();
    expect(rowTouchRule).toContain(
      '.shop-page__shelf .shop-page__slot-row--interactive .shop-page__slot-item-value',
    );
    expect(rowTouchRule).toContain(
      '.shop-page__player-shelf .shop-page__slot-row--interactive .shop-page__slot-item-value',
    );
    expect(rowTouchRule).toContain(
      '.shop-page__player-request-row.shop-page__slot-row--interactive',
    );
    expect(baseCss.slice(baseCss.indexOf(rowTouchRule))).toMatch(
      /\btext-decoration:\s*none;/,
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
      ['1.', 'empty stand', 'select'],
      ['2.', 'empty stand', 'level 3'],
      ['3.', 'empty stand', 'locked'],
      ['4.', 'empty stand', 'locked'],
      ['5.', 'empty stand', 'locked'],
    ]);
    expect(rows[0].querySelector('.shop-page__slot-empty-rule')).toBeNull();
    expect(rows[0].getAttribute('aria-pressed')).toBe('true');
    expect(rows[0].classList.contains('is-selected')).toBe(false);
    expect(rows[1].getAttribute('aria-pressed')).toBeNull();

    manager.unmount();
  });

  it('buys the next NPC market stand when tapping the locked row text', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    let buyCount = 0;
    const gameplaySnapshot = {
      gold: { current: 150 },
      research: { completedResearchIds: [] },
      shop: {
        shelf: {
          maxSlots: 5,
          selectedSlotNumber: 1,
          nextSlotNumber: 3,
          nextSlotCost: 150,
          nextSlotLockedByLevel: false,
          slotCosts: [0, 50, 150, 400, 1000],
          sellKinds: [],
          sellItems: [],
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
    const gameplayFacade = {
      subscribe(callback) {
        callback(gameplaySnapshot);
        return () => {};
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
      buyShopShelfSlot() {
        buyCount += 1;
        return { ok: true, cost: 150, slotNumber: 3 };
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const rows = [...stage.querySelectorAll('.shop-page__slot-row')];
    rows[2]
      .querySelector('.shop-page__slot-item-value')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(buyCount).toBe(1);

    manager.unmount();
  });

  it('buys the next NPC market stand on touchstart of the locked row text', () => {
    withPointerEvent(() => {
      const stage = document.createElement('section');
      const popupLayer = document.createElement('section');
      let buyCount = 0;
      const gameplaySnapshot = {
        gold: { current: 0 },
        research: { completedResearchIds: [] },
        shop: {
          shelf: {
            maxSlots: 5,
            selectedSlotNumber: 1,
            nextSlotNumber: 1,
            nextSlotCost: 0,
            nextSlotLockedByLevel: false,
            slotCosts: [0, 50, 150, 400, 1000],
            sellKinds: [],
            sellItems: [],
            slots: [
              { slotNumber: 1, unlocked: false },
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
        buyShopShelfSlot() {
          buyCount += 1;
          return { ok: true, cost: 0, slotNumber: 1 };
        },
      };
      const manager = new ShopShelfManager({ gameplayFacade });

      manager.mount(stage, popupLayer);

      const itemValue = stage.querySelector('.shop-page__slot-item-value');
      expect(stage.querySelector('.shop-page__slot-unlock-action')?.textContent).toBe(
        'free',
      );
      itemValue?.dispatchEvent(createTouchStartEvent());
      itemValue?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(buyCount).toBe(1);

      manager.unmount();
    });
  });

  it('buys the next NPC market stand from keyboard focus on the locked row', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    let buyCount = 0;
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: [] },
      shop: {
        shelf: {
          maxSlots: 5,
          selectedSlotNumber: null,
          nextSlotNumber: 1,
          nextSlotCost: 0,
          nextSlotLockedByLevel: false,
          slotCosts: [0, 50, 150, 400, 1000],
          sellKinds: [],
          sellItems: [],
          slots: [
            { slotNumber: 1, unlocked: false },
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
      buyShopShelfSlot() {
        buyCount += 1;
        return { ok: true, cost: 0, slotNumber: 1 };
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const unlockButton = stage.querySelector('.shop-page__slot-unlock-button');
    expect(unlockButton?.textContent).toBe('1.empty standfree');
    expect(unlockButton?.getAttribute('aria-label')).toBe(
      'unlock npc market stand 1 for free',
    );

    unlockButton?.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(buyCount).toBe(1);

    manager.unmount();
  });

  it('buys the next NPC market stand on touchstart of the buy button', () => {
    withPointerEvent(() => {
      const stage = document.createElement('section');
      const popupLayer = document.createElement('section');
      let buyCount = 0;
      const gameplaySnapshot = {
        gold: { current: 0 },
        research: { completedResearchIds: [] },
        shop: {
          shelf: {
            maxSlots: 5,
            selectedSlotNumber: 1,
            nextSlotNumber: 1,
            nextSlotCost: 0,
            nextSlotLockedByLevel: false,
            slotCosts: [0, 50, 150, 400, 1000],
            sellKinds: [],
            sellItems: [],
            slots: [
              { slotNumber: 1, unlocked: false },
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
        buyShopShelfSlot() {
          buyCount += 1;
          return { ok: true, cost: 0, slotNumber: 1 };
        },
      };
      const manager = new ShopShelfManager({ gameplayFacade });

      manager.mount(stage, popupLayer);

      const unlockButton = stage.querySelector('.shop-page__slot-unlock-button');
      unlockButton?.dispatchEvent(createTouchStartEvent());
      unlockButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(buyCount).toBe(1);

      manager.unmount();
    });
  });

  it('opens NPC market sell picker from the stand row', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    let selectCount = 0;
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
              sellNeed: 12,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 1,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'sage seed',
              sellQuantity: 1,
              sellGold: 8,
              sellNeed: 12,
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
      selectShopShelfSlot(slotNumber) {
        selectCount += 1;
        gameplaySnapshot.shop.shelf.selectedSlotNumber = slotNumber;
        return { ok: true, slotNumber };
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const row = stage.querySelector('.shop-page__slot-row');
    const itemValue = row.querySelector('.shop-page__slot-item-value');
    const priceValue = row.querySelector('.shop-page__slot-price-value');
    const popup = popupLayer.querySelector('.shop-page__sell-popup');

    priceValue.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(selectCount).toBe(1);

    manager.hideSellPopup();
    row.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(popup.hidden).toBe(false);
    expect(selectCount).toBe(2);

    manager.hideSellPopup();
    itemValue.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(false);
    expect(selectCount).toBe(3);

    manager.unmount();
  });

  it('opens NPC market sell picker on touchstart of the stand item text', () => {
    withPointerEvent(() => {
      const stage = document.createElement('section');
      const popupLayer = document.createElement('section');
      let selectCount = 0;
      const gameplaySnapshot = {
        gold: { current: 0 },
        research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
                sellNeed: 12,
              },
            ],
            slots: [
              {
                slotNumber: 1,
                unlocked: true,
                sellItemTypeId: 1,
                sellKind: 'seed',
                sellKey: 'sageSeed',
                sellLabel: 'sage seed',
                sellQuantity: 1,
                sellGold: 8,
                sellNeed: 12,
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
        selectShopShelfSlot(slotNumber) {
          selectCount += 1;
          gameplaySnapshot.shop.shelf.selectedSlotNumber = slotNumber;
          return { ok: true, slotNumber };
        },
      };
      const manager = new ShopShelfManager({ gameplayFacade });

      manager.mount(stage, popupLayer);

      const itemValue = stage.querySelector('.shop-page__slot-item-value');
      const popup = popupLayer.querySelector('.shop-page__sell-popup');

      itemValue?.dispatchEvent(createTouchStartEvent());
      itemValue?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(popup.hidden).toBe(false);
      expect(selectCount).toBe(1);

      manager.unmount();
    });
  });

  it('keeps NPC market sell picker open when the touch-open click retargets to the backdrop', () => {
    withPointerEvent(() => {
      const stage = document.createElement('section');
      const popupLayer = document.createElement('section');
      let selectCount = 0;
      const gameplaySnapshot = {
        gold: { current: 0 },
        research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
                sellNeed: 12,
              },
            ],
            slots: [
              {
                slotNumber: 1,
                unlocked: true,
                sellItemTypeId: null,
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
        selectShopShelfSlot(slotNumber) {
          selectCount += 1;
          gameplaySnapshot.shop.shelf.selectedSlotNumber = slotNumber;
          return { ok: true, slotNumber };
        },
      };
      const manager = new ShopShelfManager({ gameplayFacade });

      manager.mount(stage, popupLayer);

      const itemValue = stage.querySelector('.shop-page__slot-item-value');
      const popup = popupLayer.querySelector('.shop-page__sell-popup');

      itemValue?.dispatchEvent(createTouchStartEvent());
      popup?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(popup?.hidden).toBe(false);
      expect(selectCount).toBe(1);

      popup?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(popup?.hidden).toBe(true);

      manager.unmount();
    });
  });

  it('keeps NPC market tutorial targets on item names, not prices', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
              sellNeed: 12,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: null,
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
    manager.showSellPopup();

    const row = stage.querySelector('.shop-page__slot-row');
    const standTarget = stage.querySelector('[data-tutorial-id="shop:stand:1"]');
    const sellTarget = popupLayer.querySelector('[data-tutorial-id="shop:sell:sageSeed"]');
    const emptyTarget = popupLayer.querySelector('[data-tutorial-id="shop:sell:empty"]');

    expect(row?.dataset.tutorialId).toBeUndefined();
    expect(standTarget?.classList.contains('shop-page__slot-item-value')).toBe(true);
    expect(
      stage.querySelector('.shop-page__slot-price-value')?.dataset.tutorialId,
    ).toBeUndefined();
    expect(sellTarget?.classList.contains('row_key')).toBe(true);
    expect(sellTarget?.closest('.shop-page__sell-item-button')?.textContent).toBe(
      'sage seed (1) 8 gold',
    );
    expect(emptyTarget?.classList.contains('row_key')).toBe(true);
    expect(
      popupLayer.querySelector('.shop-page__sell-item-button > .row_val')?.dataset
        .tutorialId,
    ).toBeUndefined();

    manager.unmount();
  });

  it('selects an NPC market sell item from touchstart on the visible seed text', () => {
    withPointerEvent(() => {
      const stage = document.createElement('section');
      const popupLayer = document.createElement('section');
      const gameplaySnapshot = {
        gold: { current: 0 },
        research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
                sellNeed: 12,
              },
            ],
            slots: [
              {
                slotNumber: 1,
                unlocked: true,
                sellItemTypeId: null,
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
        setSelectedShopShelfSlotSellItem(itemTypeId) {
          const item = gameplaySnapshot.shop.shelf.sellItems[0];
          Object.assign(gameplaySnapshot.shop.shelf.slots[0], {
            sellItemTypeId: itemTypeId,
            sellKind: item.kind,
            sellKey: item.key,
            sellLabel: item.label,
            sellQuantity: item.quantity,
            sellGold: item.sellGold,
            sellNeed: item.sellNeed,
          });
          return { ok: true, item };
        },
      };
      const manager = new ShopShelfManager({ gameplayFacade });

      manager.mount(stage, popupLayer);
      manager.showSellPopup();

      const visibleSeedText = popupLayer.querySelector(
        '[data-tutorial-id="shop:sell:sageSeed"] .style-seed-label__text',
      );
      visibleSeedText?.dispatchEvent(createTouchStartEvent());

      expect(gameplaySnapshot.shop.shelf.slots[0].sellItemTypeId).toBe(1);
      expect(popupLayer.querySelector('.shop-page__sell-popup')?.hidden).toBe(true);

      manager.unmount();
    });
  });

  it('keeps NPC market stand item text stable across renders so taps can open picker', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const listeners = new Set();
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
              sellNeed: 12,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 1,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'sage seed',
              sellQuantity: 1,
              sellGold: 8,
              sellNeed: 12,
            },
          ],
        },
      },
    };
    const gameplayFacade = {
      subscribe(callback) {
        listeners.add(callback);
        callback(gameplaySnapshot);
        return () => listeners.delete(callback);
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
      publish() {
        for (const listener of listeners) {
          listener(gameplaySnapshot);
        }
      },
      selectShopShelfSlot(slotNumber) {
        gameplaySnapshot.shop.shelf.selectedSlotNumber = slotNumber;
        return { ok: true, slotNumber };
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const labelText = stage.querySelector(
      '.shop-page__slot-item-value .style-seed-label__text',
    );

    expect(labelText).not.toBeNull();

    gameplayFacade.publish();

    expect(
      stage.querySelector('.shop-page__slot-item-value .style-seed-label__text'),
    ).toBe(labelText);

    labelText.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(false);

    manager.unmount();
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'free',
    );
  });

  it('formats player market stand buy costs as compact gold text', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 1000)).toBe(
      'buy (1k gold)',
    );
  });

  it('uses selling and buying tabs in browse market popup', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 10 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        playerShelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [],
          slots: [{ slotNumber: 1, unlocked: true }],
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
      listings: [
        {
          listingKey: 'seller:1',
          sellerIdentity: 'seller',
          username: 'Merlin',
          slotNumber: 1,
          itemKey: 'sageSeed',
          itemLabel: 'sage seed',
          itemKind: 'seed',
          quantity: 3,
          priceGold: 2,
        },
      ],
      ownListings: [],
      requests: [
        {
          requestKey: 'requester:1',
          requesterIdentity: 'requester',
          username: 'Hershel',
          slotNumber: 1,
          itemKey: 'mintSeed',
          itemLabel: 'mint seed',
          itemKind: 'seed',
          quantity: 4,
          priceGold: 3.25,
        },
      ],
      ownRequests: [],
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
    stage
      .querySelector('.shop-page__other-shops-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__market-popup');
    const tabButtons = [...popup.querySelectorAll('.shop-page__market-popup-tab-button')];

    expect(tabButtons.map((button) => button.textContent)).toEqual(['selling', 'buying']);
    expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.shop-page__market-seller-name')?.textContent).toBe('Merlin');
    expect(popup.querySelector('.shop-page__market-message')?.hidden).toBe(true);

    tabButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tabButtons[1].getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.shop-page__market-seller-name')?.textContent).toBe(
      'Hershel',
    );
    expect(popup.querySelector('.shop-page__market-request-row')?.textContent).toContain(
      '- mint seed (4) 3.25 gold',
    );

    manager.unmount();
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
    expect(rows[0].getAttribute('aria-pressed')).toBe('true');
    expect(rows[0].classList.contains('is-selected')).toBe(false);
    expect(rows[1].getAttribute('aria-pressed')).toBeNull();
    expect(stage.querySelector('.shop-page__player-proceeds-row')).toBeNull();

    manager.unmount();
  });

  it('buys the next player market stand when tapping the locked row text', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    let buyCount = 0;
    let selectCount = 0;
    const gameplaySnapshot = {
      gold: { current: 150 },
      research: { completedResearchIds: [] },
      shop: {
        playerShelf: {
          maxSlots: 5,
          selectedSlotNumber: 1,
          nextSlotNumber: 3,
          nextSlotCost: 150,
          nextSlotLockedByLevel: false,
          slotCosts: [0, 50, 150, 400, 1000],
          sellKinds: [],
          sellItems: [],
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
    const gameplayFacade = {
      subscribe(callback) {
        callback(gameplaySnapshot);
        return () => {};
      },
      getSnapshot() {
        return gameplaySnapshot;
      },
      buyPlayerShopShelfSlot() {
        buyCount += 1;
        return { ok: true, cost: 150, slotNumber: 3 };
      },
      selectPlayerShopShelfSlot() {
        selectCount += 1;
        return { ok: false, reason: 'slot_locked' };
      },
      applyPlayerShopMarketSlotQuantity() {},
    };
    const manager = new ShopPlayerShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);

    const rows = [...stage.querySelectorAll('.shop-page__player-slot-row')];
    rows[2]
      .querySelector('.shop-page__slot-item-value')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(buyCount).toBe(1);
    expect(selectCount).toBe(0);

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
    manager.showSellPopup();

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

  it('shows tutorial fallback stand prices while FTUE market pricing is active', () => {
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
    const manager = new ShopShelfManager({
      gameplayFacade,
      getSellPriceOverride: ({ item }) => (item?.key === 'manaTonic' ? 100 : null),
    });

    manager.mount(stage, popupLayer);

    const standValue = stage.querySelector('.shop-page__slot-row .row_val');
    const priceValue = stage.querySelector('.shop-page__slot-price-value');

    expect(standValue?.textContent).toBe('mana tonic (0) 100 gold');
    expect(priceValue?.getAttribute('data-resource-color')).toBe('gold');

    manager.unmount();
  });

  it('shows remaining bulk sell time on the NPC market bottom line', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        shelf: {
          autoSellSeconds: 1_800,
          sellProgressSeconds: 900,
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
              quantity: 4,
              sellGold: 1,
              sellNeed: 1000,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 1,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'sage seed',
              sellQuantity: 4,
              sellGold: 1,
              sellNeed: 1000,
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

    expect(stage.querySelector('.shop-page__shelf-timer')?.textContent).toBe(
      'timer 15m',
    );
    expect(stage.querySelector('.shop-page__slot-timer-value')).toBeNull();
    expect(stage.querySelector('.shop-page__slot-row .row_val')?.textContent).toBe(
      'sage seed (4) 1 gold',
    );

    gameplaySnapshot.shop.shelf.sellProgressSeconds = 1_800;
    manager.render(gameplaySnapshot);

    expect(stage.querySelector('.shop-page__shelf-timer')?.textContent).toBe(
      'timer ready',
    );

    manager.unmount();
  });

  it('hides the NPC market bottom timer when no stand has an item', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      shop: {
        shelf: {
          autoSellSeconds: 1_800,
          sellProgressSeconds: 900,
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [],
          slots: [{ slotNumber: 1, unlocked: true }],
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

    const timer = stage.querySelector('.shop-page__shelf-timer');

    expect(timer?.hidden).toBe(true);
    expect(timer?.textContent).toBe('');

    manager.unmount();
  });

  it('allows choosing an NPC market item while demand is depleted', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      gold: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
              quantity: 8,
              sellGold: 0.01,
              sellNeed: 0,
            },
          ],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: null,
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
      setSelectedShopShelfSlotSellItem(itemTypeId) {
        const item = gameplaySnapshot.shop.shelf.sellItems.find(
          (sellItem) => sellItem.itemTypeId === itemTypeId,
        );
        const slot = gameplaySnapshot.shop.shelf.slots[0];
        slot.sellItemTypeId = item.itemTypeId;
        slot.sellKind = item.kind;
        slot.sellKey = item.key;
        slot.sellLabel = item.label;
        slot.sellQuantity = item.quantity;
        slot.sellGold = item.sellGold;
        slot.sellNeed = item.sellNeed;

        return {
          ok: true,
          slotNumber: slot.slotNumber,
          item,
        };
      },
    };
    const manager = new ShopShelfManager({ gameplayFacade });

    manager.mount(stage, popupLayer);
    manager.showSellPopup();

    const sageButton = [...popupLayer.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (8) 0.01 gold');

    expect(sageButton?.disabled).toBe(false);
    expect(
      manager.canSelectSellItem(gameplaySnapshot, gameplaySnapshot.shop.shelf.sellItems[0]),
    ).toBe(true);

    sageButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplaySnapshot.shop.shelf.slots[0].sellItemTypeId).toBe(1);
    expect(popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);

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
    expect(stage.querySelector('.shop-page__player-proceeds-row')).toBeNull();
    expect(stage.querySelector('.shop-page__claim-proceeds-button')?.hidden).toBe(true);

    manager.unmount();
  });
});

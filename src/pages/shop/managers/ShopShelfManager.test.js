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
    setPlayerShopRequest(slotNumber, { itemTypeId, quantity, priceCoin }) {
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
        priceCoin,
      });
      publish();
      return { ok: true, slotNumber, item, quantity, priceCoin };
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
      delete slot.priceCoin;
      publish();
      return { ok: true, slotNumber };
    },
  };
}

describe('ShopShelfManager', () => {
  it('switches between trader and player market panels', () => {
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
    ).toEqual(['traders', 'players', 'crystals']);
    expect(stage.querySelector('.shop-page__market-identity')?.textContent)
      .toBe('small town market ★');
    const playerTab = [...stage.querySelectorAll('.shop-page__market-tab-button')].find(
      (button) => button.textContent === 'players',
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

  it('shows child notifications on market tab buttons', () => {
    const stage = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        shelf: {
          nextSlotNumber: 2,
          nextSlotCost: 1,
          nextSlotLockedByLevel: false,
          sellItems: [],
          slots: [],
        },
        playerShelf: {
          nextSlotNumber: 2,
          nextSlotCost: 1,
          nextSlotLockedByLevel: false,
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
        coinOffer: {
          canCollect: true,
        },
      },
    };
    const playerShopSnapshot = {
      connected: true,
      listings: [],
      proceedsCoin: 0,
    };
    const manager = new ShopMarketTabsManager({
      gameplayFacade: {
        subscribe(callback) {
          callback(gameplaySnapshot);
          return () => {};
        },
        getSnapshot() {
          return gameplaySnapshot;
        },
      },
      playerShopFacade: {
        subscribe(callback) {
          callback(playerShopSnapshot);
          return () => {};
        },
        getSnapshot() {
          return playerShopSnapshot;
        },
      },
    });

    manager.mount(stage);

    const buttons = [...stage.querySelectorAll('.shop-page__market-tab-button')];
    const playerTab = buttons.find((button) => button.textContent === 'players');
    const crystalsTab = buttons.find((button) => button.textContent === 'crystals');
    const npcTab = buttons.find((button) => button.textContent === 'traders');

    expect(playerTab?.dataset.notification).toBeUndefined();
    expect(playerTab?.dataset.notificationTone).toBeUndefined();
    expect(crystalsTab?.dataset.notification).toBe('true');
    expect(crystalsTab?.dataset.notificationTone).toBe('red');
    expect(npcTab?.dataset.notification).toBeUndefined();

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

    const [quantityInput, coinInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '2';
    coinInput.value = '4';

    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.mint seed (2) 4 coin',
    );

    requestRows[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    [...popup.querySelectorAll('.shop-page__sell-item-button')]
      .find((button) => button.textContent === 'sage seed (0)')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    quantityInput.value = '1';
    coinInput.value = '1';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.sage seed (1) 1 coin',
    );
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '2.mint seed (2) 4 coin',
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
      '2.mint seed (2) 4 coin',
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

    const [quantityInput, coinInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '3';
    coinInput.value = '3';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (3) 3 coin',
    );

    manager.unmount();
    manager.mount(stage, popupLayer);

    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (3) 3 coin',
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

    const [quantityInput, coinInput] =
      popup.querySelectorAll('.shop-page__request-input');
    quantityInput.value = '4';
    coinInput.value = '4';
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
      priceCoin: 4,
    });
    expect(popup.hidden).toBe(true);
    expect(stage.querySelector('.shop-page__player-request')?.textContent).toContain(
      '1.mint seed (4) 4 coin',
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

  it('shows player market request max errors before publishing', () => {
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

    const [quantityInput, coinInput] =
      popup.querySelectorAll('.shop-page__request-input');
    expect(quantityInput.getAttribute('max')).toBe('1000');
    expect(coinInput.getAttribute('max')).toBe('1000000');
    expect(coinInput.getAttribute('min')).toBe('1');
    expect(coinInput.getAttribute('step')).toBe('1');
    expect(coinInput.inputMode).toBe('numeric');

    quantityInput.value = '1001';
    coinInput.value = '1';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.querySelector('.shop-page__request-status')?.textContent).toBe('max 1000');
    expect(playerShopFacade.setSlotRequest).not.toHaveBeenCalled();

    quantityInput.value = '1';
    coinInput.value = '1000001';
    popup
      .querySelector('.shop-page__request-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.querySelector('.shop-page__request-status')?.textContent).toBe(
      'max 1m coin',
    );
    expect(playerShopFacade.setSlotRequest).not.toHaveBeenCalled();

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

  it('keeps trader market free stand buys clear of the demand border action', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const firstSlotRule = baseCss.match(
      /\.shop-page__shelf > \.shop-page__slot-row:first-of-type\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const unlockButtonRule = baseCss.match(
      /\.shop-page__slot-unlock-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rowActionRule = baseCss.match(
      /\.shop-page__shelf \.shop-page__slot-row--interactive \.shop-page__slot-item-value,\s*\.shop-page__player-shelf\s*\.shop-page__slot-row--interactive\s*\.shop-page__slot-item-value,\s*\.shop-page__player-request-row\.shop-page__slot-row--interactive\s*\.shop-page__request-row-item\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(firstSlotRule).toBeDefined();
    expect(firstSlotRule).toMatch(
      /margin-top:\s*calc\(\s*var\(--style-box-border-label-line-height\) \+ var\(--style-row-column-gap\)\s*\);/,
    );
    expect(unlockButtonRule).toBeDefined();
    expect(unlockButtonRule).toMatch(/\bdisplay:\s*grid;/);
    expect(unlockButtonRule).toMatch(/\bgrid-column:\s*1 \/ -1;/);
    expect(unlockButtonRule).toMatch(/\btouch-action:\s*manipulation;/);
    expect(rowActionRule).toBeDefined();
    expect(rowActionRule).toMatch(/\bfont-weight:\s*normal;/);
  });

  it('shows the stall progress rail and timer together beneath the item row', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        shelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          autoSellSeconds: 5,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [],
          slots: [
            {
              slotNumber: 1,
              unlocked: true,
              sellItemTypeId: 1,
              sellKind: 'seed',
              sellKey: 'sageSeed',
              sellLabel: 'sage seed',
              loadedQuantity: 13,
              batchSize: 1,
              sellCoin: 5,
              sellProgressSeconds: 2,
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

    const itemColumn = stage.querySelector('.shop-page__slot-item-column');
    const status = stage.querySelector('.shop-page__slot-status-value');
    const progressRow = stage.querySelector('.shop-page__slot-progress-row');
    const progress = progressRow?.querySelector('.shop-page__slot-progress');
    const fill = progressRow?.querySelector('.shop-page__slot-progress-fill');
    const timer = progressRow?.querySelector('.shop-page__slot-timer-value');
    const capacity = stage.querySelector('.shop-page__slot-capacity-value');
    const quantity = stage.querySelector('.shop-page__slot-quantity-value');

    expect(status?.classList.contains('is-active')).toBe(true);
    expect(status?.querySelector('.shop-page__slot-batch-value')?.textContent).toBe('x1');
    expect(progress?.classList.contains('style-progress')).toBe(true);
    expect(progress?.classList.contains('style-progress--timer')).toBe(true);
    expect(progress?.getAttribute('role')).toBe('progressbar');
    expect(progress?.getAttribute('aria-valuenow')).toBe('40');
    expect(fill?.style.transform).toBe('scaleX(0.4)');
    expect(itemColumn?.firstElementChild).toBe(
      stage.querySelector('.shop-page__slot-item-value'),
    );
    expect(itemColumn?.lastElementChild).toBe(quantity);
    expect(progressRow?.firstElementChild).toBe(progress);
    expect(progressRow?.lastElementChild).toBe(timer);
    expect(status?.querySelector('.shop-page__slot-progress')).toBeNull();
    expect(status?.querySelector('.shop-page__slot-timer-value')).toBeNull();
    expect(timer?.textContent).toBe('3s');
    expect(status?.querySelector('.shop-page__slot-price-value')?.textContent).toContain(
      '5 coin',
    );
    expect(capacity?.textContent).toBe('★');
    expect(capacity?.getAttribute('aria-hidden')).toBe('true');
    expect(quantity?.textContent).toBe(' 13');
    expect(itemColumn?.textContent).toBe('sage seed 13');

    manager.unmount();
  });

  it('uses the sketch-aligned stall card grid and full-width progress row', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const slotRowRule = baseCss.match(
      /\.shop-page__slot-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const progressRowRule = baseCss.match(
      /(?:^|\n)\.shop-page__slot-progress-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(baseCss).toMatch(
      /--shop-page-slot-row-min-height:\s*calc\(\s*var\(--style-row-min-height\) \+ var\(--style-progress-total-height\) \+ 7px\s*\);/,
    );
    expect(slotRowRule).toMatch(
      /min-height:\s*var\(--shop-page-slot-row-min-height\);/,
    );
    expect(baseCss).toMatch(
      /\.shop-page__shelf > \.shop-page__slot-row\s*\{[\s\S]*?grid-template-areas:\s*\n\s*"title capacity batch"\s*\n\s*"visual item price"\s*\n\s*"visual progress progress";/,
    );
    expect(baseCss).toMatch(
      /\.shop-page__shelf > \.shop-page__slot-row\s*\{[\s\S]*?min-height:\s*84px;/,
    );
    expect(progressRowRule).toMatch(/grid-column:\s*1 \/ -1;/);
    expect(progressRowRule).toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\) max-content;/,
    );
  });

  it('opens NPC market sell picker from the stand row', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    let selectCount = 0;
    const gameplaySnapshot = {
      coin: { current: 0 },
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
              sellCoin: 8,
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
              sellCoin: 8,
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
        coin: { current: 0 },
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
                sellCoin: 8,
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
                sellCoin: 8,
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

  it('keeps NPC market sell picker weight stable with the shared scroll rail gap', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const unselectedRule = baseCss.match(
      /\.shop-page__sell-popup\s+\.shop-page__sell-item-button:not\(\[aria-pressed="true"\]\)\s+\.row_key\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const selectedRule = baseCss.match(
      /\.shop-page__sell-popup \.shop-page__sell-item-button\[aria-pressed="true"\] \.row_key\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const listRule = baseCss.match(
      /\.shop-page__sell-controls:not\(\.shop-page__player-listing-controls\)\s+\.shop-page__sell-item-list\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(unselectedRule).toMatch(/\bfont-weight:\s*normal;/);
    expect(selectedRule).toBeUndefined();
    expect(listRule).toMatch(
      /\bvar\(--style-scroll-progress-block-size\)/,
    );
    expect(baseCss).not.toMatch(/--shop-page-sell-scroll-progress-gap:/);
    expect(baseCss).toMatch(
      /\.shop-page__sell-dialog\s*>\s*\.shop-page__sell-item-list\s*\{(?<body>[^}]*)\}/,
    );
    expect(baseCss).toMatch(
      /\.shop-page__sell-item-button\[aria-pressed="true"\]\s*\{\s*color:\s*var\(--style-text\);\s*background:\s*var\(--shop-page-sell-row-selected-surface\);/,
    );
    expect(baseCss).toContain('gap: 6px;');
  });

  it('shows zero-cost player market stand buys as free', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 0)).toBe(
      'free',
    );
  });

  it('formats player market stand buy costs as compact coin text', () => {
    const manager = new ShopPlayerShelfManager();

    expect(manager.formatLockedSlotAction({ nextSlotLockedByLevel: false }, 1000)).toBe(
      'buy (1k coin)',
    );
  });

  it('uses selling and buying tabs in browse market popup', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 10 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        playerShelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [{ kind: 'seed', label: 'seeds' }],
          sellItems: [
            {
              itemTypeId: 2,
              key: 'mintSeed',
              label: 'mint seed',
              kind: 'seed',
              quantity: 7,
            },
          ],
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
      selectPlayerShopShelfSlot(slotNumber) {
        gameplaySnapshot.shop.playerShelf.selectedSlotNumber = slotNumber;
        return { ok: true, slotNumber };
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
          priceCoin: 2,
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
      priceCoin: 4,
        },
      ],
      ownRequests: [],
      proceedsCoin: 0,
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
    const browseButton = stage.querySelector('.shop-page__other-shops-button');

    expect(browseButton?.dataset.notification).toBeUndefined();

    browseButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__market-popup');
    const tabButtons = [...popup.querySelectorAll('.shop-page__market-popup-tab-button')];

    expect(tabButtons.map((button) => button.textContent)).toEqual(['selling', 'buying']);
    expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.shop-page__market-seller-name')?.textContent).toBe('Merlin');
    expect(popup.querySelector('.shop-page__market-message')?.hidden).toBe(true);
    expect(
      popup.querySelector('.shop-page__market-buy-button')?.dataset.notification,
    ).toBeUndefined();

    tabButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(tabButtons[1].getAttribute('aria-selected')).toBe('true');
    expect(popup.querySelector('.shop-page__market-seller-name')?.textContent).toBe(
      'Hershel',
    );
    const requestRow = popup.querySelector('.shop-page__market-request-row');
    expect(requestRow?.querySelector('.shop-page__market-request-detail')?.textContent).toContain(
      'wants 4',
    );
    expect(requestRow?.querySelector('.shop-page__market-request-detail')?.textContent).toContain(
      'you 7',
    );
    requestRow
      ?.querySelector('.shop-page__market-request-sell-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const listingPopup = popupLayer.querySelector('.shop-page__player-listing-popup');
    expect(listingPopup?.hidden).toBe(false);
    expect(
      listingPopup?.querySelector('.shop-page__player-listing-selected-item')?.textContent,
    ).toBe('mint seed');
    expect(listingPopup?.querySelector('.shop-page__player-listing-input')?.value).toBe('4');
    expect(
      listingPopup?.querySelectorAll('.shop-page__player-listing-input')?.[1]?.value,
    ).toBe('4');

    manager.unmount();
  });

  it('shows player market listing max errors before publishing', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 0 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
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
              quantity: 2_000,
            },
          ],
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
      selectPlayerShopShelfSlot(slotNumber) {
        gameplaySnapshot.shop.playerShelf.selectedSlotNumber = slotNumber;
        return { ok: true, slotNumber };
      },
      applyPlayerShopMarketSlotQuantity() {},
    };
    const playerShopFacade = {
      subscribe(callback) {
        callback({
          connected: true,
          listings: [],
          ownListings: [],
          requests: [],
          ownRequests: [],
          proceedsCoin: 0,
        });
        return () => {};
      },
      getSnapshot() {
        return {
          connected: true,
          listings: [],
          ownListings: [],
          requests: [],
          ownRequests: [],
          proceedsCoin: 0,
        };
      },
      setSlotListing: vi.fn(async () => ({ ok: true })),
    };
    const manager = new ShopPlayerShelfManager({ gameplayFacade, playerShopFacade });

    manager.mount(stage, popupLayer);
    stage
      .querySelector('.shop-page__player-slot-row')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.shop-page__player-listing-popup');
    const itemButton = [...popup.querySelectorAll('.shop-page__sell-item-button')].find(
      (button) => button.textContent === 'sage seed (2000)',
    );
    itemButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const [quantityInput, priceInput] = popup.querySelectorAll(
      '.shop-page__player-listing-input',
    );
    expect(quantityInput.getAttribute('max')).toBe('1000');
    expect(priceInput.getAttribute('max')).toBe('1000000');
    expect(priceInput.getAttribute('min')).toBe('1');
    expect(priceInput.getAttribute('step')).toBe('1');
    expect(priceInput.inputMode).toBe('numeric');

    quantityInput.value = '1001';
    priceInput.value = '1';
    popup
      .querySelector('.shop-page__player-listing-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.querySelector('.shop-page__player-shop-status')?.textContent).toBe(
      'max 1000',
    );
    expect(playerShopFacade.setSlotListing).not.toHaveBeenCalled();

    quantityInput.value = '1';
    priceInput.value = '1000001';
    popup
      .querySelector('.shop-page__player-listing-place-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup.querySelector('.shop-page__player-shop-status')?.textContent).toBe(
      'max 1m coin',
    );
    expect(playerShopFacade.setSlotListing).not.toHaveBeenCalled();

    manager.unmount();
  });

  it('notifies browse market only when a listing matches an own request', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 10 },
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      shop: {
        playerShelf: {
          maxSlots: 1,
          selectedSlotNumber: 1,
          slotCosts: [0],
          sellKinds: [],
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
          quantity: 2,
          priceCoin: 3,
        },
      ],
      ownListings: [],
      requests: [],
      ownRequests: [
        {
          requestKey: 'self:1',
          requesterIdentity: 'self',
          username: 'wizard',
          slotNumber: 1,
          itemKey: 'sageSeed',
          itemLabel: 'sage seed',
          itemKind: 'seed',
          quantity: 1,
          priceCoin: 3,
        },
      ],
      proceedsCoin: 0,
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

    const browseButton = stage.querySelector('.shop-page__other-shops-button');
    expect(browseButton?.dataset.notification).toBe('true');

    browseButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const buyButton = popupLayer.querySelector('.shop-page__market-buy-button');
    expect(buyButton?.dataset.notification).toBe('true');

    manager.unmount();
  });

  it('labels empty player market stands by lock state', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 0 },
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
      coin: { current: 150 },
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

  it('does not show empty player market stand notifications', () => {
    const stage = document.createElement('section');
    const popupLayer = document.createElement('section');
    const gameplaySnapshot = {
      coin: { current: 0 },
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
      proceedsCoin: 0,
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
    expect(row?.dataset.notification).toBeUndefined();
    expect(row?.dataset.notificationTone).toBeUndefined();
    expect(stage.querySelector('.shop-page__player-proceeds-row')).toBeNull();
    expect(stage.querySelector('.shop-page__claim-proceeds-button')?.hidden).toBe(true);

    manager.unmount();
  });
});

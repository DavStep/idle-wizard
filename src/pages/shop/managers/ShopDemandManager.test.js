/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopDemandManager } from './ShopDemandManager.js';

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

function createSnapshot() {
  return {
    research: { completedResearchIds: ['unlockSeed:sageSeed'] },
    shop: {
      shelf: {
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'sage seed',
            kind: 'seed',
            quantity: 1,
            sellNeed: 235,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'mint seed',
            kind: 'seed',
            quantity: 0,
            sellNeed: 623,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'sage',
            kind: 'herb',
            quantity: 0,
            sellNeed: 412,
          },
        ],
      },
    },
  };
}

describe('ShopDemandManager', () => {
  it('opens NPC demand in tabbed popup with locked rows muted', () => {
    const buttonParent = document.createElement('section');
    const popupParent = document.createElement('section');
    const snapshot = createSnapshot();
    const gameplayFacade = {
      subscribe(callback) {
        callback(snapshot);
        return () => {};
      },
      getSnapshot() {
        return snapshot;
      },
    };
    const manager = new ShopDemandManager({ gameplayFacade });

    manager.mount({ buttonParent, popupParent });
    const button = buttonParent.querySelector('.shop-page__demand-button');
    button.click();

    const popup = popupParent.querySelector('.shop-page__demand-popup');
    const rows = [...popup.querySelectorAll('.shop-page__demand-row')];
    const tabs = popup.querySelector('.shop-page__demand-tabs');

    expect(button.textContent).toBe('demand');
    expect(popup.hidden).toBe(false);
    expect(
      popup.querySelector('.shop-page__demand-dialog')?.nextElementSibling,
    ).toBe(tabs);
    expect([...tabs.querySelectorAll('.shop-page__demand-tab-button')].map(
      (tab) => tab.textContent,
    )).toEqual(['seed', 'herb', 'potion']);
    expect(rows.map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.row_val')?.textContent,
      row.classList.contains('is-locked'),
    ])).toEqual([
      ['sage seed', '235', false],
      ['mint seed', '623', true],
    ]);
    expect(popup.querySelector('.shop-page__demand-divider')).toBeNull();

    manager.unmount();
  });

  it('switches demand tabs by item kind', () => {
    const buttonParent = document.createElement('section');
    const popupParent = document.createElement('section');
    const snapshot = createSnapshot();
    const gameplayFacade = {
      subscribe(callback) {
        callback(snapshot);
        return () => {};
      },
      getSnapshot() {
        return snapshot;
      },
    };
    const manager = new ShopDemandManager({ gameplayFacade });

    manager.mount({ buttonParent, popupParent });
    buttonParent.querySelector('.shop-page__demand-button')?.click();
    const herbTab = [...popupParent.querySelectorAll('.shop-page__demand-tab-button')]
      .find((tab) => tab.textContent === 'herb');
    herbTab.click();

    const rows = [...popupParent.querySelectorAll('.shop-page__demand-row')];

    expect(rows.map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.row_val')?.textContent,
    ])).toEqual([['sage', '412']]);
    expect(herbTab.getAttribute('aria-selected')).toBe('true');

    manager.unmount();
  });

  it('opens NPC demand on touchstart of the border label', () => {
    withPointerEvent(() => {
      const buttonParent = document.createElement('section');
      const popupParent = document.createElement('section');
      const snapshot = createSnapshot();
      const gameplayFacade = {
        subscribe(callback) {
          callback(snapshot);
          return () => {};
        },
        getSnapshot() {
          return snapshot;
        },
      };
      const manager = new ShopDemandManager({ gameplayFacade });

      manager.mount({ buttonParent, popupParent });
      const button = buttonParent.querySelector('.shop-page__demand-button');
      const popup = popupParent.querySelector('.shop-page__demand-popup');

      button.dispatchEvent(createTouchStartEvent());
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(popup.hidden).toBe(false);
      expect([...popup.querySelectorAll('.shop-page__demand-row')].map((row) =>
        row.querySelector('.row_key')?.textContent,
      )).toEqual(['sage seed', 'mint seed']);

      manager.unmount();
    });
  });
});

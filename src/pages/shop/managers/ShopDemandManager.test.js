/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import { ShopDemandManager } from './ShopDemandManager.js';

function createSnapshot() {
  return {
    research: { completedResearchIds: ['unlockSeed:sageSeed'] },
    shop: {
      shelf: {
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            label: 'Sage Seed',
            kind: 'seed',
            quantity: 1,
            sellNeed: 235,
          },
          {
            itemTypeId: 2,
            key: 'mintSeed',
            label: 'Mint Seed',
            kind: 'seed',
            quantity: 0,
            sellNeed: 623,
          },
          {
            itemTypeId: 1001,
            key: 'sageHerb',
            label: 'Sage',
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
      ['Sage Seed', '235', false],
      ['Mint Seed', '623', true],
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
    const herbTab = [...popupParent.querySelectorAll('.shop-page__demand-tab-button')]
      .find((tab) => tab.textContent === 'herb');
    herbTab.click();

    const rows = [...popupParent.querySelectorAll('.shop-page__demand-row')];

    expect(rows.map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.row_val')?.textContent,
    ])).toEqual([['Sage', '412']]);
    expect(herbTab.getAttribute('aria-selected')).toBe('true');

    manager.unmount();
  });
});

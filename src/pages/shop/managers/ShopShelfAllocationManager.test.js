/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShopShelfManager } from './ShopShelfManager.js';

function createHarness({ loadedQuantity = 0, sageQuantity = 1_000 } = {}) {
  const listeners = new Set();
  const sageSeed = {
    itemTypeId: 1,
    key: 'sageSeed',
    kind: 'seed',
    label: 'sage seed',
    quantity: sageQuantity,
    sellCoin: 2,
  };
  const mintSeed = {
    itemTypeId: 2,
    key: 'mintSeed',
    kind: 'seed',
    label: 'mint seed',
    quantity: 0,
    sellCoin: 3,
  };
  const slot = {
    slotNumber: 1,
    unlocked: true,
    sellItemTypeId: loadedQuantity > 0 ? 1 : null,
    sellKey: loadedQuantity > 0 ? sageSeed.key : null,
    sellKind: loadedQuantity > 0 ? sageSeed.kind : null,
    sellLabel: loadedQuantity > 0 ? sageSeed.label : null,
    loadedQuantity,
    sellProgressSeconds: 0,
    batchSize: 1,
    sellCoin: loadedQuantity > 0 ? sageSeed.sellCoin : null,
    futureItemTypeId: null,
    futureItemKey: null,
    futureItemKind: null,
    futureItemLabel: null,
    futurePendingQuantity: 0,
  };
  const snapshot = {
    research: { completedResearchIds: ['unlockSeed:sageSeed', 'unlockSeed:mintSeed'] },
    shop: {
      shelf: {
        autoSellSeconds: 5,
        maxSlots: 1,
        selectedSlotNumber: 1,
        sellKinds: [{ kind: 'seed', label: 'seeds' }],
        sellItems: [sageSeed, mintSeed],
        slots: [slot],
      },
    },
  };
  const publish = () => listeners.forEach((listener) => listener(snapshot));
  const selectShopShelfSlot = vi.fn(() => ({ ok: true, slotNumber: 1 }));
  const applyTargetQuantity = (itemTypeId, targetQuantity) => {
    const item = itemTypeId === sageSeed.itemTypeId ? sageSeed : mintSeed;
    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded' };
    }
    const loaded = slot.sellItemTypeId === itemTypeId ? slot.loadedQuantity : 0;
    const total = item.quantity + loaded;
    const target = Math.max(0, Math.min(total, Math.floor(targetQuantity)));
    const delta = target - loaded;
    item.quantity -= delta;
    slot.sellItemTypeId = target > 0 ? itemTypeId : null;
    slot.sellKey = target > 0 ? item.key : null;
    slot.sellKind = target > 0 ? item.kind : null;
    slot.sellLabel = target > 0 ? item.label : null;
    slot.sellCoin = target > 0 ? item.sellCoin : null;
    slot.loadedQuantity = target;
    publish();
    return { ok: true, targetQuantity: target, loadedQuantity: target };
  };
  const setSelectedShopShelfSlotAllocation = vi.fn((itemTypeId, percentage) => {
    const item = itemTypeId === sageSeed.itemTypeId ? sageSeed : mintSeed;
    const total =
      item.quantity +
      (slot.sellItemTypeId === itemTypeId ? slot.loadedQuantity : 0);
    return applyTargetQuantity(
      itemTypeId,
      Math.floor((total * percentage) / 100),
    );
  });
  const setSelectedShopShelfSlotQuantity = vi.fn(applyTargetQuantity);
  const clearSelectedShopShelfSlot = vi.fn(() => {
    if (slot.sellItemTypeId === sageSeed.itemTypeId) {
      sageSeed.quantity += slot.loadedQuantity;
    }
    if (slot.sellItemTypeId === mintSeed.itemTypeId) {
      mintSeed.quantity += slot.loadedQuantity;
    }
    slot.sellItemTypeId = null;
    slot.sellKey = null;
    slot.sellKind = null;
    slot.sellLabel = null;
    slot.sellCoin = null;
    slot.loadedQuantity = 0;
    slot.futureItemTypeId = null;
    slot.futureItemKey = null;
    slot.futureItemKind = null;
    slot.futureItemLabel = null;
    slot.futurePendingQuantity = 0;
    publish();
    return { ok: true, slotNumber: 1, returnedQuantity: loadedQuantity };
  });
  const gameplayFacade = {
    clearSelectedShopShelfSlot,
    getSnapshot: () => snapshot,
    selectShopShelfSlot,
    setSelectedShopShelfSlotAllocation,
    setSelectedShopShelfSlotQuantity,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
  const stage = document.createElement('section');
  const popupLayer = document.createElement('section');
  const manager = new ShopShelfManager({ gameplayFacade });
  manager.mount(stage, popupLayer);

  return {
    manager,
    clearSelectedShopShelfSlot,
    mintSeed,
    popupLayer,
    sageSeed,
    setSelectedShopShelfSlotAllocation,
    setSelectedShopShelfSlotQuantity,
    slot,
    stage,
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ShopShelfManager quantity allocation', () => {
  it('shows an empty current row and a disabled integer slider before selection', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    const popup = harness.popupLayer.querySelector('.shop-page__sell-popup');
    const actions = [
      ...popup.querySelectorAll('.shop-page__sell-action-row > .style-button'),
    ];

    expect(popup.querySelector('.shop-page__sell-current')?.textContent).toContain(
      'currentempty',
    );
    expect(actions.map((button) => button.textContent)).toEqual([
      'clear',
      'mark x0',
    ]);
    expect(popup.querySelector('.shop-page__sell-future-button')).toBeNull();
    expect(popup.querySelector('.shop-page__sell-allocation-range')).toMatchObject({
      min: '0',
      max: '0',
      step: '1',
      disabled: true,
    });
    expect(popup.querySelector('.shop-page__sell-allocation-progress')).not.toBeNull();
    expect(popup.querySelectorAll('.shop-page__sell-allocation-tick')).toHaveLength(0);
    expect(
      popup
        .querySelector('.shop-page__sell-mark-button')
        .classList.contains('style-button--green'),
    ).toBe(true);
    expect(
      popup
        .querySelector('.shop-page__sell-clear-button')
        .classList.contains('style-button--red'),
    ).toBe(true);
    expect(popup.textContent).not.toContain('hold');
  });

  it('selects an inventory row without changing gameplay stock', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    const item = harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]');

    item.click();

    expect(harness.setSelectedShopShelfSlotAllocation).not.toHaveBeenCalled();
    expect(harness.popupLayer.querySelector('.shop-page__sell-current')?.textContent)
      .toContain('sage seedx1000');
    expect(harness.popupLayer.querySelector('.shop-page__sell-allocation-range').value)
      .toBe('1000');
  });

  it('snaps a three-item stall through exact integer counts', () => {
    const harness = createHarness({ sageQuantity: 3 });
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');
    expect(range).toMatchObject({
      min: '0',
      max: '3',
      step: '1',
      value: '3',
    });

    range.value = '2';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x2');
    harness.popupLayer.querySelector('.shop-page__sell-mark-button').click();

    expect(harness.setSelectedShopShelfSlotQuantity).toHaveBeenCalledOnce();
    expect(harness.setSelectedShopShelfSlotQuantity).toHaveBeenCalledWith(1, 2);
    expect(harness.slot.loadedQuantity).toBe(2);
    expect(harness.sageSeed.quantity).toBe(1);
    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('moves the marked quantity in one-item steps', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');

    range.value = '5';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x5');

    range.value = '1000';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    range.dispatchEvent(
      new window.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
    );

    expect(range.value).toBe('999');
    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x999');
  });

  it('uses 0 to return all currently marked stock', () => {
    const harness = createHarness({ loadedQuantity: 100, sageQuantity: 900 });
    harness.manager.showSellPopup();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');
    range.value = '0';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    harness.popupLayer.querySelector('.shop-page__sell-mark-button').click();

    expect(harness.setSelectedShopShelfSlotQuantity).toHaveBeenCalledWith(1, 0);
    expect(harness.slot.loadedQuantity).toBe(0);
    expect(harness.sageSeed.quantity).toBe(1_000);
  });

  it('clears loaded stock and future marking, then closes the dialog', () => {
    const harness = createHarness({ loadedQuantity: 100, sageQuantity: 900 });
    harness.manager.showSellPopup();

    harness.popupLayer.querySelector('.shop-page__sell-clear-button').click();

    expect(harness.clearSelectedShopShelfSlot).toHaveBeenCalledOnce();
    expect(harness.slot.loadedQuantity).toBe(0);
    expect(harness.sageSeed.quantity).toBe(1_000);
    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('keeps item icon nodes stable across unchanged timer renders', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const itemLabel = harness.popupLayer.querySelector(
      '[data-shop-sell-item-key="sageSeed"] .row_key',
    );
    const currentLabel = harness.popupLayer.querySelector('.shop-page__sell-current-item');
    const itemIcon = itemLabel.querySelector('.style-seed-label__icon');
    const currentIcon = currentLabel.querySelector('.style-seed-label__icon');

    harness.manager.render(harness.manager.gameplayFacade.getSnapshot());

    expect(itemLabel.querySelector('.style-seed-label__icon')).toBe(itemIcon);
    expect(currentLabel.querySelector('.style-seed-label__icon')).toBe(currentIcon);
  });

  it('disables other item types while a stand has loaded or future-marked stock', () => {
    const loaded = createHarness({ loadedQuantity: 1 });
    loaded.manager.showSellPopup();
    expect(
      loaded.popupLayer.querySelector('[data-shop-sell-item-key="mintSeed"]').disabled,
    ).toBe(true);

    const future = createHarness();
    future.slot.futureItemTypeId = 1;
    future.slot.futureItemKey = 'sageSeed';
    future.slot.futureItemKind = 'seed';
    future.slot.futureItemLabel = 'sage seed';
    future.manager.render(future.manager.gameplayFacade.getSnapshot());
    future.manager.showSellPopup();
    expect(
      future.popupLayer.querySelector('[data-shop-sell-item-key="mintSeed"]').disabled,
    ).toBe(true);
  });

  it('opens a loaded stand on a normal click without a hold path', () => {
    const harness = createHarness({ loadedQuantity: 100 });
    harness.stage.querySelector('.shop-page__slot-row').click();

    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(false);
    expect(harness.popupLayer.querySelector('.shop-page__sell-current')?.textContent)
      .toContain('sage seed');
  });

  it('exposes tutorial targets for the item, percentage, and mark controls', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();

    for (const tutorialId of [
      'shop:sell:sageSeed',
      'shop:sell:percentage',
      'shop:sell:mark',
    ]) {
      expect(harness.popupLayer.querySelector(`[data-tutorial-id="${tutorialId}"]`))
        .not.toBeNull();
    }
  });
});

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
  const setSelectedShopShelfSlotAllocation = vi.fn((itemTypeId, percentage) => {
    const item = itemTypeId === sageSeed.itemTypeId ? sageSeed : mintSeed;
    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded' };
    }
    const loaded = slot.sellItemTypeId === itemTypeId ? slot.loadedQuantity : 0;
    const total = item.quantity + loaded;
    const target = Math.floor((total * percentage) / 100);
    const delta = target - loaded;
    item.quantity -= delta;
    slot.sellItemTypeId = target > 0 ? itemTypeId : null;
    slot.sellKey = target > 0 ? item.key : null;
    slot.sellKind = target > 0 ? item.kind : null;
    slot.sellLabel = target > 0 ? item.label : null;
    slot.sellCoin = target > 0 ? item.sellCoin : null;
    slot.loadedQuantity = target;
    publish();
    return { ok: true, percentage, targetQuantity: target, loadedQuantity: target };
  });
  const setSelectedShopShelfFutureItem = vi.fn((itemTypeId, enabled) => {
    const item = itemTypeId === sageSeed.itemTypeId ? sageSeed : mintSeed;
    slot.futureItemTypeId = enabled ? itemTypeId : null;
    slot.futureItemKey = enabled ? item.key : null;
    slot.futureItemKind = enabled ? item.kind : null;
    slot.futureItemLabel = enabled ? item.label : null;
    slot.futurePendingQuantity = 0;
    publish();
    return { ok: true, enabled, itemTypeId: enabled ? itemTypeId : null };
  });
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
    setSelectedShopShelfFutureItem,
    setSelectedShopShelfSlotAllocation,
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
    setSelectedShopShelfFutureItem,
    setSelectedShopShelfSlotAllocation,
    slot,
    stage,
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ShopShelfManager percentage allocation', () => {
  it('shows an empty current row and a five-percent progress slider before selection', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    const popup = harness.popupLayer.querySelector('.shop-page__sell-popup');

    expect(popup.querySelector('.shop-page__sell-current')?.textContent).toContain(
      'currentempty',
    );
    expect(popup.querySelector('.shop-page__sell-allocation-range')).toMatchObject({
      min: '0',
      max: '100',
      step: '5',
      disabled: true,
    });
    expect(popup.querySelector('.shop-page__sell-allocation-progress')).not.toBeNull();
    expect(popup.querySelectorAll('.shop-page__sell-allocation-tick')).toHaveLength(0);
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
      .toBe('100');
  });

  it('updates the marked quantity at 25% and applies it in one gameplay call', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');
    range.value = '25';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x250');
    harness.popupLayer.querySelector('.shop-page__sell-mark-button').click();

    expect(harness.setSelectedShopShelfSlotAllocation).toHaveBeenCalledOnce();
    expect(harness.setSelectedShopShelfSlotAllocation).toHaveBeenCalledWith(1, 25);
    expect(harness.slot.loadedQuantity).toBe(250);
    expect(harness.sageSeed.quantity).toBe(750);
    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('moves the marked quantity in five-percent steps', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');

    range.value = '5';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));

    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x50');

    range.value = '100';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    range.dispatchEvent(
      new window.KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }),
    );

    expect(range.value).toBe('95');
    expect(harness.popupLayer.querySelector('.shop-page__sell-mark-button').textContent)
      .toBe('mark x950');
  });

  it('uses 0% to return all currently marked stock', () => {
    const harness = createHarness({ loadedQuantity: 100, sageQuantity: 900 });
    harness.manager.showSellPopup();
    const range = harness.popupLayer.querySelector('.shop-page__sell-allocation-range');
    range.value = '0';
    range.dispatchEvent(new window.Event('input', { bubbles: true }));
    harness.popupLayer.querySelector('.shop-page__sell-mark-button').click();

    expect(harness.setSelectedShopShelfSlotAllocation).toHaveBeenCalledWith(1, 0);
    expect(harness.slot.loadedQuantity).toBe(0);
    expect(harness.sageSeed.quantity).toBe(1_000);
  });

  it('can mark a researched zero-count item for all future production', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    const item = harness.popupLayer.querySelector('[data-shop-sell-item-key="mintSeed"]');

    expect(item.disabled).toBe(false);
    item.click();
    const future = harness.popupLayer.querySelector('.shop-page__sell-future-button');
    future.click();

    expect(harness.setSelectedShopShelfFutureItem).toHaveBeenCalledWith(2, true);
    expect(future.textContent).toBe('stop future');
    expect(future.getAttribute('aria-pressed')).toBe('true');
    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);
    expect(harness.stage.querySelector('.shop-page__slot-item-value')?.textContent)
      .toContain('waiting for mint seed');
  });

  it('stops future marking from the same selected item', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    const future = harness.popupLayer.querySelector('.shop-page__sell-future-button');
    future.click();
    harness.manager.showSellPopup();
    future.click();

    expect(harness.setSelectedShopShelfFutureItem).toHaveBeenLastCalledWith(1, false);
    expect(future.textContent).toBe('mark future');
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
    future.manager.showSellPopup();
    future.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').click();
    future.popupLayer.querySelector('.shop-page__sell-future-button').click();
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

  it('exposes tutorial targets for the item, percentage, mark, and future controls', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();

    for (const tutorialId of [
      'shop:sell:sageSeed',
      'shop:sell:percentage',
      'shop:sell:mark',
      'shop:sell:future',
    ]) {
      expect(harness.popupLayer.querySelector(`[data-tutorial-id="${tutorialId}"]`))
        .not.toBeNull();
    }
  });
});

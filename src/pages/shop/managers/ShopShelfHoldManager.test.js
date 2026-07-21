/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDynamicStallTransferStep,
  ShopShelfManager,
} from './ShopShelfManager.js';

function pointerEvent(type, { pointerId = 1, x = 0, y = 0 } = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries({
    button: 0,
    pointerId,
    clientX: x,
    clientY: y,
  })) {
    Object.defineProperty(event, key, { configurable: true, value });
  }
  return event;
}

function createHarness({ loadedQuantity = 0 } = {}) {
  const listeners = new Set();
  const sageSeed = {
    itemTypeId: 1,
    key: 'sageSeed',
    kind: 'seed',
    label: 'sage seed',
    quantity: 1_000,
    sellCoin: 2,
  };
  const mintSeed = {
    itemTypeId: 2,
    key: 'mintSeed',
    kind: 'seed',
    label: 'mint seed',
    quantity: 1_000,
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
  const commitShopShelfChanges = vi.fn();
  const loadSelectedShopShelfSlotItem = vi.fn((itemTypeId, quantity) => {
    const item = itemTypeId === sageSeed.itemTypeId ? sageSeed : mintSeed;
    if (slot.sellItemTypeId && slot.sellItemTypeId !== itemTypeId) {
      return { ok: false, reason: 'different_item_loaded' };
    }
    const moved = Math.min(quantity, item.quantity);
    if (moved <= 0) return { ok: false, reason: 'not_enough_items' };
    item.quantity -= moved;
    slot.sellItemTypeId = itemTypeId;
    slot.sellKey = item.key;
    slot.sellKind = item.kind;
    slot.sellLabel = item.label;
    slot.sellCoin = item.sellCoin;
    slot.loadedQuantity += moved;
    publish();
    return { ok: true, quantity: moved };
  });
  const unloadSelectedShopShelfSlotItem = vi.fn((quantity) => {
    const moved = Math.min(quantity, slot.loadedQuantity);
    if (moved <= 0) return { ok: false, reason: 'empty_slot' };
    sageSeed.quantity += moved;
    slot.loadedQuantity -= moved;
    if (slot.loadedQuantity === 0) {
      slot.sellItemTypeId = null;
      slot.sellKey = null;
      slot.sellKind = null;
      slot.sellLabel = null;
      slot.sellCoin = null;
    }
    publish();
    return { ok: true, quantity: moved };
  });
  const gameplayFacade = {
    commitShopShelfChanges,
    getSnapshot: () => snapshot,
    loadSelectedShopShelfSlotItem,
    selectShopShelfSlot: () => ({ ok: true, slotNumber: 1 }),
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    unloadSelectedShopShelfSlotItem,
  };
  const stage = document.createElement('section');
  const popupLayer = document.createElement('section');
  const manager = new ShopShelfManager({ gameplayFacade });
  manager.mount(stage, popupLayer);

  return {
    commitShopShelfChanges,
    gameplayFacade,
    loadSelectedShopShelfSlotItem,
    manager,
    mintSeed,
    popupLayer,
    sageSeed,
    slot,
    stage,
    unloadSelectedShopShelfSlotItem,
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('ShopShelfManager hold transfers', () => {
  it('scales transfer steps gently with the loaded quantity', () => {
    expect([0, 10, 100, 1_000, 100_000].map(getDynamicStallTransferStep)).toEqual([
      1,
      1,
      5,
      50,
      500,
    ]);
  });

  it('loads once on press and saves once on release', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();
    const button = harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]');

    button.dispatchEvent(pointerEvent('pointerdown'));
    button.dispatchEvent(pointerEvent('pointerup'));

    expect(harness.loadSelectedShopShelfSlotItem).toHaveBeenCalledTimes(1);
    expect(harness.loadSelectedShopShelfSlotItem).toHaveBeenCalledWith(1, 1, {
      save: false,
    });
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
    expect(harness.slot.loadedQuantity).toBe(1);
  });

  it('ends the transfer when pointer release lands outside the item button', () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.manager.showSellPopup();
    const button = harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]');

    button.dispatchEvent(pointerEvent('pointerdown'));
    document.body.dispatchEvent(pointerEvent('pointerup'));
    vi.advanceTimersByTime(500);

    expect(harness.loadSelectedShopShelfSlotItem).toHaveBeenCalledTimes(1);
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
  });

  it('repeats dynamically during a hold but commits only on release', () => {
    vi.useFakeTimers();
    const harness = createHarness({ loadedQuantity: 100 });
    harness.manager.showSellPopup();
    const button = harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]');

    button.dispatchEvent(pointerEvent('pointerdown'));
    vi.advanceTimersByTime(460);

    expect(harness.loadSelectedShopShelfSlotItem.mock.calls[0][1]).toBe(5);
    expect(harness.loadSelectedShopShelfSlotItem.mock.calls.length).toBeGreaterThan(2);
    expect(harness.commitShopShelfChanges).not.toHaveBeenCalled();

    button.dispatchEvent(pointerEvent('pointerup'));
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
  });

  it('cancels a hold when the pointer becomes a scroll gesture', () => {
    vi.useFakeTimers();
    const harness = createHarness();
    harness.manager.showSellPopup();
    const button = harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]');

    button.dispatchEvent(pointerEvent('pointerdown'));
    button.dispatchEvent(pointerEvent('pointermove', { x: 20 }));
    vi.advanceTimersByTime(500);

    expect(harness.loadSelectedShopShelfSlotItem).toHaveBeenCalledTimes(1);
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
  });

  it('holds a loaded stall item to return stock without opening the popup', () => {
    vi.useFakeTimers();
    const harness = createHarness({ loadedQuantity: 100 });
    const item = harness.stage.querySelector('.shop-page__slot-item-value');

    item.dispatchEvent(pointerEvent('pointerdown'));
    vi.advanceTimersByTime(360);
    item.dispatchEvent(pointerEvent('pointerup'));
    item.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(harness.unloadSelectedShopShelfSlotItem).toHaveBeenCalledWith(5, {
      save: false,
    });
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
    expect(harness.popupLayer.querySelector('.shop-page__sell-popup').hidden).toBe(true);
  });

  it('disables other item types while a stand contains one item', () => {
    const harness = createHarness({ loadedQuantity: 1 });
    harness.manager.showSellPopup();

    expect(
      harness.popupLayer.querySelector('[data-shop-sell-item-key="sageSeed"]').disabled,
    ).toBe(false);
    expect(
      harness.popupLayer.querySelector('[data-shop-sell-item-key="mintSeed"]').disabled,
    ).toBe(true);
  });

  it('lets keyboard users return loaded stock with Delete', () => {
    const harness = createHarness({ loadedQuantity: 10 });
    const row = harness.stage.querySelector('.shop-page__slot-row');

    row.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

    expect(harness.unloadSelectedShopShelfSlotItem).toHaveBeenCalledWith(1, {
      save: false,
    });
    expect(harness.commitShopShelfChanges).toHaveBeenCalledTimes(1);
  });

  it('exposes stable tutorial targets for stands, tabs, and sell items', () => {
    const harness = createHarness();
    harness.manager.showSellPopup();

    expect(harness.stage.querySelector('[data-tutorial-id="shop:stand:1"]')).not.toBeNull();
    expect(
      harness.popupLayer.querySelector('[data-tutorial-id="shop:sell:tab:seed"]'),
    ).not.toBeNull();
    expect(
      harness.popupLayer.querySelector('[data-tutorial-id="shop:sell:sageSeed"]'),
    ).not.toBeNull();
  });
});

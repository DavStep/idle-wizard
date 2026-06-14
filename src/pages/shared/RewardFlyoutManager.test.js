// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardFlyoutManager } from './RewardFlyoutManager.js';

function setRect(element, rect) {
  const fullRect = {
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON() {
      return this;
    },
    ...rect,
  };

  element.getBoundingClientRect = () => fullRect;
}

describe('RewardFlyoutManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
    delete document.documentElement.dataset.styleIcons;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    delete document.documentElement.dataset.styleIcons;
  });

  it('plays Idle Witch Craft-style item drops and coin flyout when icons are enabled', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const summonCircle = document.createElement('span');
    summonCircle.className = 'workshop-page__summon-circle';
    setRect(summonCircle, { left: 100, top: 200, width: 80, height: 80 });

    const slot = document.createElement('div');
    slot.className = 'shop-page__slot-row';
    slot.dataset.shopSlotNumber = '1';

    const slotItem = document.createElement('span');
    slotItem.className = 'shop-page__slot-item-value';
    setRect(slotItem, { left: 220, top: 360, width: 120, height: 30 });
    slot.append(slotItem);
    host.append(summonCircle, slot);

    const goldTarget = document.createElement('span');
    goldTarget.className = 'room-top-panel__resource';
    goldTarget.setAttribute('aria-label', 'gold');
    setRect(goldTarget, { left: 12, top: 18, width: 90, height: 24 });
    document.body.append(host, goldTarget);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'seed_summoned',
      quantity: 2,
      seedCounts: [{ seed: { key: 'sageSeed', label: 'sage seed', kind: 'seed' }, quantity: 2 }],
    });
    manager.showReward({
      type: 'item_sold',
      item: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      gold: 1000,
      quantity: 1,
      slotNumber: 1,
    });

    expect(document.querySelectorAll('.room-item-drop.is-seed-burst')).toHaveLength(3);
    expect(document.querySelectorAll('.room-seed-pack-composite')).toHaveLength(3);
    expect(document.querySelectorAll('.room-coin-particle').length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('.room-coin-amt-pop')?.textContent).toBe('+1000G');

    manager.unmount();

    expect(document.querySelector('.room-item-drop')).toBeNull();
    expect(document.querySelector('.room-coin-particle')).toBeNull();
    expect(document.querySelector('.room-coin-amt-pop')).toBeNull();
  });

  it('keeps reward visuals disabled when icon mode is off', () => {
    const host = document.createElement('section');
    const summonCircle = document.createElement('span');
    summonCircle.className = 'workshop-page__summon-circle';
    setRect(summonCircle, { left: 100, top: 200, width: 80, height: 80 });
    host.append(summonCircle);
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'seed_summoned',
      seed: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      quantity: 1,
    });

    expect(document.querySelector('.room-reward-flyout')?.textContent).toBe('sage seed found');
    expect(document.querySelector('.room-item-drop')).toBeNull();
  });
});

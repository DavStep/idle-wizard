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
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
    delete document.documentElement.dataset.styleIcons;
    vi.unstubAllGlobals();
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

    const slotPrice = document.createElement('span');
    slotPrice.className = 'shop-page__slot-price-value';
    setRect(slotPrice, { left: 420, top: 360, width: 90, height: 30 });
    slot.append(slotItem, slotPrice);
    host.append(summonCircle, slot);

    const coinTarget = document.createElement('span');
    coinTarget.className = 'room-top-panel__resource';
    coinTarget.setAttribute('aria-label', 'coin');
    setRect(coinTarget, { left: 12, top: 18, width: 90, height: 24 });
    document.body.append(host, coinTarget);

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
      coin: 1000,
      quantity: 1,
      slotNumber: 1,
    });

    expect(document.querySelectorAll('.room-item-drop.is-seed-burst')).toHaveLength(3);
    expect(document.querySelectorAll('.room-seed-pack-composite')).toHaveLength(3);
    expect(
      document.querySelector('.room-seed-pack-composite')?.dataset.seedPackItemFrame,
    ).toBe('herb:sageHerb');
    expect(
      document.querySelector('.room-seed-pack-composite .room-seed-pack-item')?.dataset
        .assetAtlasFrame,
    ).toBe('herb:sageHerb');
    expect(document.querySelector('.room-reward-flyout')?.classList).toContain(
      'is-visual-only',
    );
    expect(document.querySelectorAll('.room-coin-particle').length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('.room-coin-amt-pop')?.textContent).toBe('+1000G');
    expect(document.querySelector('.room-coin-particle')?.style.left).toBe('465px');
    expect(document.querySelector('.room-coin-particle')?.style.top).toBe('373.2px');
    expect(document.querySelector('.room-coin-amt-pop')?.style.left).toBe('465px');
    expect(document.querySelector('.room-coin-amt-pop')?.style.top).toBe('369.2px');

    manager.unmount();

    expect(document.querySelector('.room-item-drop')).toBeNull();
    expect(document.querySelector('.room-coin-particle')).toBeNull();
    expect(document.querySelector('.room-coin-amt-pop')).toBeNull();
  });

  it('plays bought item drops from the ledger buy dialog and caps visual drops at twelve', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const popup = document.createElement('section');
    popup.className = 'shop-page__ledger-buy-dialog';

    const stockItem = document.createElement('span');
    stockItem.dataset.shopLedgerItemKey = 'sageSeed';
    setRect(stockItem, { left: 240, top: 360, width: 120, height: 30 });
    popup.append(stockItem);
    host.append(popup);
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'item_bought',
      source: 'npc_stock',
      item: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      quantity: 20,
      coin: 40,
    });

    expect(document.querySelectorAll('.room-item-drop-anchor.is-seed')).toHaveLength(12);
    expect(document.querySelector('.room-item-drop-anchor.is-seed')?.style.left).toBe('300px');
    expect(document.querySelector('.room-item-drop-anchor.is-seed')?.style.top).toBe('375px');
    expect(document.querySelector('.room-reward-flyout')?.textContent).toBe(
      'bought sage seed x20 for 40 coin',
    );
    expect(document.querySelector('.room-reward-flyout')?.classList).toContain(
      'is-visual-only',
    );

    manager.unmount();
  });

  it('anchors seed drops to the stage and starts them a bit above summon', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    setRect(stage, { left: 500, top: 50, width: 320, height: 640 });

    const host = document.createElement('section');
    const summonCircle = document.createElement('span');
    summonCircle.className = 'workshop-page__summon-circle';
    setRect(summonCircle, { left: 600, top: 200, width: 80, height: 80 });

    host.append(summonCircle);
    stage.append(host);
    document.body.append(stage);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'seed_summoned',
      seed: { key: 'sageSeed', label: 'sage seed', kind: 'seed' },
      quantity: 1,
    });

    const anchor = document.querySelector('.room-item-drop-anchor.is-seed');
    expect(anchor?.parentElement).toBe(stage);
    expect(anchor?.style.position).toBe('absolute');
    expect(anchor?.style.left).toBe('140px');
    expect(anchor?.style.top).toBe('174px');
  });

  it('plays reward visuals when icon mode data is missing', () => {
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
    expect(document.querySelector('.room-reward-flyout')?.classList).toContain(
      'is-visual-only',
    );
    expect(document.querySelector('.room-item-drop-anchor.is-seed')).not.toBeNull();
  });

  it('keeps seed summon text visible in icon mode when reduced motion disables drops', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    document.documentElement.dataset.styleIcons = 'icons';
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
    expect(document.querySelector('.room-reward-flyout')?.classList).not.toContain(
      'is-visual-only',
    );
    expect(document.querySelector('.room-item-drop')).toBeNull();
  });

  it('plays coin flyout when coin is collected from the coin offer', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const collectButton = document.createElement('button');
    collectButton.className = 'shop-page__coin-offer-action';
    setRect(collectButton, { left: 320, top: 410, width: 90, height: 30 });
    host.append(collectButton);

    const coinTarget = document.createElement('span');
    coinTarget.className = 'room-top-panel__resource';
    coinTarget.setAttribute('aria-label', 'coin');
    setRect(coinTarget, { left: 12, top: 18, width: 90, height: 24 });
    document.body.append(host, coinTarget);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'coin_collected',
      coin: 20,
      source: 'shop_coin_offer',
    });

    expect(document.querySelector('.room-reward-flyout')?.textContent).toBe('collected 20 coin');
    expect(document.querySelectorAll('.room-coin-particle').length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('.room-coin-amt-pop')?.textContent).toBe('+20G');
    expect(document.querySelector('.room-coin-particle')?.style.left).toBe('365px');
    expect(document.querySelector('.room-coin-particle')?.style.top).toBe('423.2px');
    expect(
      [...document.head.querySelectorAll('style')].some((style) =>
        style.textContent?.includes('room-coin-fly'),
      ),
    ).toBe(false);

    manager.unmount();
  });

  it('keeps personal task reward text visible while animating claimed coin', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const stage = document.createElement('section');
    stage.className = 'game-stage';
    setRect(stage, { left: 0, top: 0, width: 520, height: 920 });

    const host = document.createElement('section');
    const popup = document.createElement('section');
    popup.className = 'workshop-page__personal-tasks-popup';

    const claimButton = document.createElement('button');
    claimButton.className = 'workshop-page__personal-task-claim';
    claimButton.dataset.personalTaskPeriodType = 'daily';
    claimButton.dataset.personalTaskId = 'task-1';
    setRect(claimButton, { left: 260, top: 420, width: 70, height: 24 });
    popup.append(claimButton);

    const coinTarget = document.createElement('span');
    coinTarget.className = 'room-top-panel__resource';
    coinTarget.setAttribute('aria-label', 'coin');
    setRect(coinTarget, { left: 12, top: 18, width: 90, height: 24 });

    stage.append(host, popup, coinTarget);
    document.body.append(stage);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'personal_task_reward_claimed',
      periodType: 'daily',
      taskId: 'task-1',
      coin: 15,
      crystal: 1,
    });

    const flyout = document.querySelector('.room-reward-flyout');
    expect(flyout?.textContent).toBe('+15 coin, +1 crystal');
    expect(flyout?.classList).not.toContain('is-visual-only');
    expect(document.querySelectorAll('.room-coin-particle').length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('.room-coin-amt-pop')?.textContent).toBe('+15G');
    expect(document.querySelector('.room-coin-particle')?.style.left).toBe('295px');
    expect(document.querySelector('.room-coin-particle')?.style.top).toBe('430.56px');

    manager.unmount();
  });

  it('keeps independent text flyouts on the same anchor', () => {
    const host = document.createElement('section');
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    const hidden = manager.show('visual seed found', { visualOnly: true });
    const first = manager.show('sage seed found');
    const second = manager.show('-10 mana');

    expect(hidden?.style.getPropertyValue('--style-flyout-offset')).toBe('');
    expect(first?.style.getPropertyValue('--style-flyout-offset')).toBe('');
    expect(second?.style.getPropertyValue('--style-flyout-offset')).toBe('');
    expect(hidden?.style.animationDelay).toBe('');
    expect(first?.style.animationDelay).toBe('');
    expect(second?.style.animationDelay).toBe('55ms');

    manager.unmount();
  });

  it('shows list flyouts together with a small stagger', () => {
    const host = document.createElement('section');
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    const flyouts = manager.showList([
      { message: 'sage seed found' },
      { message: '-10 mana', flyoutKey: 'mana-spend' },
    ]);

    expect(flyouts.map((flyout) => flyout.textContent)).toEqual([
      'sage seed found',
      '-10 mana',
    ]);
    expect(host.querySelectorAll('.room-reward-flyout')).toHaveLength(2);
    expect(flyouts[0]?.style.animationDelay).toBe('');
    expect(flyouts[1]?.style.animationDelay).toBe('55ms');
    expect(flyouts[1]?.dataset.flyoutKey).toBe('mana-spend');

    manager.unmount();
  });

  it('reuses pooled text flyout nodes after they expire', () => {
    const host = document.createElement('section');
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    const first = manager.show('older notice');

    vi.advanceTimersByTime(1200);

    expect(host.querySelector('.room-reward-flyout')).toBeNull();

    const second = manager.show('new notice');

    expect(second).toBe(first);
    expect(second?.textContent).toBe('new notice');
    expect(second?.style.animationDelay).toBe('');
    expect(host.querySelector('.room-reward-flyout')).toBe(second);

    manager.unmount();
  });

  it('keeps repeated keyed text flyouts independent until the active text cap', () => {
    const host = document.createElement('section');
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    const first = manager.show('-10 mana', { flyoutKey: 'mana-spend' });
    const second = manager.show('-20 mana', { flyoutKey: 'mana-spend' });

    const textFlyouts = [...host.querySelectorAll('.room-reward-flyout')].filter(
      (node) => !node.classList.contains('is-visual-only'),
    );

    expect(textFlyouts).toHaveLength(2);
    expect(first?.textContent).toBe('-10 mana');
    expect(second?.textContent).toBe('-20 mana');
    expect(first?.style.animationDelay).toBe('');
    expect(second?.style.animationDelay).toBe('55ms');

    manager.unmount();
  });

  it('reuses the oldest active text flyout for the eleventh text', () => {
    const host = document.createElement('section');
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    const flyouts = Array.from({ length: 11 }, (_item, index) =>
      manager.show(`notice ${index + 1}`, { flyoutKey: 'mana-spend' }),
    );

    const textFlyouts = [...host.querySelectorAll('.room-reward-flyout')].filter(
      (node) => !node.classList.contains('is-visual-only'),
    );

    expect(textFlyouts).toHaveLength(10);
    expect(flyouts[10]).toBe(flyouts[0]);
    expect(textFlyouts.map((node) => node.textContent)).toEqual([
      'notice 2',
      'notice 3',
      'notice 4',
      'notice 5',
      'notice 6',
      'notice 7',
      'notice 8',
      'notice 9',
      'notice 10',
      'notice 11',
    ]);

    manager.unmount();
  });

  it('starts herb drops from the plant inside the garden plot', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const row = document.createElement('button');
    row.className = 'garden-page__plot-row';
    row.dataset.gardenTileNumber = '1';
    setRect(row, { left: 100, top: 280, width: 360, height: 40 });

    const frame = document.createElement('span');
    frame.className = 'garden-page__plot-box-frame';
    setRect(frame, { left: 180, top: 280, width: 120, height: 70 });

    const plant = document.createElement('span');
    plant.className = 'garden-page__plot-plant';
    setRect(plant, { left: 222, top: 292, width: 36, height: 42 });

    const progress = document.createElement('span');
    progress.className = 'garden-page__plot-progress';
    setRect(progress, { left: 160, top: 318, width: 280, height: 5 });

    frame.append(plant);
    row.append(frame, progress);
    host.append(row);
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'herb_harvested',
      herb: { key: 'sageHerb', label: 'sage', kind: 'herb' },
      quantity: 1,
      tileNumber: 1,
    });

    const anchor = document.querySelector('.room-item-drop-anchor.is-herb');
    expect(anchor?.style.left).toBe('240px');
    expect(anchor?.style.top).toBe('313px');
  });

  it('starts potion drops from the cauldron liquid', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const cauldron = document.createElement('section');
    cauldron.className = 'brewing-page__cauldron';
    cauldron.dataset.cauldronIndex = '1';
    setRect(cauldron, { left: 120, top: 300, width: 280, height: 96 });

    const cauldronArt = document.createElement('span');
    cauldronArt.className = 'brewing-page__cauldron-art';
    setRect(cauldronArt, { left: 148, top: 318, width: 96, height: 78 });

    const cauldronLiquid = document.createElement('span');
    cauldronLiquid.className = 'brewing-page__cauldron-art-liquid';
    setRect(cauldronLiquid, { left: 148, top: 318, width: 96, height: 78 });

    const potionIcon = document.createElement('span');
    potionIcon.className = 'brewing-page__cauldron-potion-icon';
    setRect(potionIcon, { left: 330, top: 324, width: 48, height: 48 });
    cauldronArt.append(cauldronLiquid);
    cauldron.append(cauldronArt, potionIcon);
    host.append(cauldron);
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'potion_collected',
      potion: { key: 'manaTonic', label: 'mana tonic', kind: 'potion' },
      quantity: 1,
      cauldronIndex: 1,
    });

    const anchor = document.querySelector('.room-item-drop-anchor.is-potion');
    expect(anchor?.style.left).toBe('196px');
    expect(anchor?.style.top).toBe('366.36px');

    manager.unmount();
  });

  it('falls back to the garden progress rail when no plot plant is measurable', () => {
    document.documentElement.dataset.styleIcons = 'icons';
    const host = document.createElement('section');
    const row = document.createElement('button');
    row.className = 'garden-page__plot-row';
    row.dataset.gardenTileNumber = '1';
    setRect(row, { left: 100, top: 280, width: 360, height: 40 });

    const progress = document.createElement('span');
    progress.className = 'garden-page__plot-progress';
    setRect(progress, { left: 160, top: 318, width: 280, height: 5 });

    row.append(progress);
    host.append(row);
    document.body.append(host);

    const manager = new RewardFlyoutManager();
    manager.mount(host);
    manager.showReward({
      type: 'herb_harvested',
      herb: { key: 'sageHerb', label: 'sage', kind: 'herb' },
      quantity: 1,
      tileNumber: 1,
    });

    const anchor = document.querySelector('.room-item-drop-anchor.is-herb');
    expect(anchor?.style.left).toBe('440px');
    expect(anchor?.style.top).toBe('320.5px');
  });
});

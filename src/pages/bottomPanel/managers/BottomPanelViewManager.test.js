/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { BottomPanelViewManager } from './BottomPanelViewManager.js';

describe('BottomPanelViewManager', () => {
  it('applies notification tones to room tabs', () => {
    const stage = document.createElement('section');
    const manager = new BottomPanelViewManager({
      getCurrentPageId: () => 'workshop',
    });

    manager.mount(stage);
    manager.setNotifications({
      shop: { active: true, tone: 'orange' },
    });

    const marketTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="shop"]',
    );

    expect(marketTab?.dataset.notification).toBe('true');
    expect(marketTab?.dataset.notificationTone).toBe('orange');

    manager.setNotifications({
      shop: { active: true, tone: 'red' },
    });

    expect(marketTab?.dataset.notificationTone).toBe('red');
  });

  it('keeps locked tabs visible and shows their unlock message on click', () => {
    const stage = document.createElement('section');
    const onShowPage = vi.fn();
    const manager = new BottomPanelViewManager({
      getCurrentPageId: () => 'workshop',
      onShowPage,
    });

    manager.mount(stage);
    manager.setNotifications({
      brewing: { active: true, tone: 'red' },
    });
    manager.setPageStates([
      {
        id: 'brewing',
        unlocked: false,
        requiredLevel: 4,
        lockedMessage: 'brewing unlocks at level 4',
      },
    ]);

    const brewingTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="brewing"]',
    );

    expect(brewingTab?.hidden).toBe(false);
    expect(brewingTab?.classList.contains('is-locked')).toBe(true);
    expect(brewingTab?.getAttribute('aria-disabled')).toBeNull();
    expect(brewingTab?.dataset.notification).toBeUndefined();

    brewingTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = stage.querySelector('.room-bottom-panel__lock-popup');

    expect(onShowPage).not.toHaveBeenCalled();
    expect(popup?.hidden).toBe(false);
    expect(popup?.classList.contains('is-entering')).toBe(true);
    expect(popup?.dataset.pageId).toBe('brewing');
    expect(
      stage.querySelector('.room-bottom-panel__lock-message')?.textContent,
    ).toBe('brewing unlocks at level 4');

    stage
      .querySelector('.room-bottom-panel__lock-close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popup?.hidden).toBe(true);
    expect(popup?.classList.contains('is-entering')).toBe(false);
    expect(popup?.dataset.pageId).toBeUndefined();
  });

  it('uses the old quests slot for the gated prestige page', () => {
    const stage = document.createElement('section');
    const onShowPage = vi.fn();
    const manager = new BottomPanelViewManager({
      getCurrentPageId: () => 'workshop',
      onShowPage,
    });

    manager.mount(stage);
    manager.setPageStates([{ id: 'prestige', unlocked: false, visible: false }]);

    const labels = [...stage.querySelectorAll('.room-bottom-panel__tab')].map(
      (button) => button.textContent,
    );
    const prestigeButton = stage.querySelector('.room-bottom-panel__prestige-button');

    expect(labels).toEqual([
      'brewing',
      'garden',
      'workshop',
      'research',
      'market',
      'adv brewing',
      'adv garden',
      'guild',
      'prestige',
      'adv market',
    ]);
    expect(prestigeButton?.dataset.pageId).toBe('prestige');
    expect(prestigeButton?.dataset.actionId).toBeUndefined();
    expect(prestigeButton?.style.visibility).toBe('hidden');
    expect(prestigeButton?.tabIndex).toBe(-1);

    prestigeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowPage).not.toHaveBeenCalled();

    manager.setPageStates([{ id: 'prestige', unlocked: true, visible: true }]);
    prestigeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowPage).toHaveBeenCalledWith('prestige');
  });
});

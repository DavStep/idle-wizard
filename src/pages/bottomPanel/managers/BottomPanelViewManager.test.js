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

  it('appends the gated prestige page only when visible', () => {
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

    expect(labels).toEqual([
      'brewing',
      'garden',
      'workshop',
      'research',
      'market',
    ]);
    expect(stage.querySelector('.room-bottom-panel__prestige-button')).toBeNull();

    manager.setPageStates([{ id: 'prestige', unlocked: true, visible: true }]);

    const prestigeButton = stage.querySelector('.room-bottom-panel__prestige-button');

    expect(prestigeButton?.dataset.pageId).toBe('prestige');
    expect(prestigeButton?.dataset.actionId).toBeUndefined();
    expect(prestigeButton?.style.visibility).toBe('');
    expect(prestigeButton?.tabIndex).toBe(0);
    prestigeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(onShowPage).toHaveBeenCalledWith('prestige');
  });

  it('does not override custom visible page gates when page states refresh', () => {
    const stage = document.createElement('section');
    const manager = new BottomPanelViewManager({
      getCurrentPageId: () => 'workshop',
    });

    manager.mount(stage);
    manager.setVisiblePageIds(['workshop']);
    manager.setPageStates([
      { id: 'brewing', unlocked: true, visible: true },
      { id: 'prestige', unlocked: true, visible: true },
    ]);

    expect(stage.querySelector('.room-bottom-panel__workshop-button')?.hidden).toBe(
      false,
    );
    expect(stage.querySelector('.room-bottom-panel__brewing-button')?.hidden).toBe(
      true,
    );
    expect(stage.querySelector('.room-bottom-panel__prestige-button')?.hidden).toBe(
      true,
    );

    manager.setVisiblePageIds(['workshop', 'prestige']);

    expect(stage.querySelector('.room-bottom-panel__prestige-button')?.hidden).toBe(
      false,
    );
  });
});

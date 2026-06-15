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
        requiredLevel: 3,
        lockedMessage: 'brewing unlocks at level 3',
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

    expect(onShowPage).not.toHaveBeenCalled();
    expect(stage.querySelector('.room-bottom-panel__lock-popup')?.hidden).toBe(false);
    expect(stage.querySelector('.room-bottom-panel__lock-message')?.textContent).toBe(
      'brewing unlocks at level 3',
    );

    stage
      .querySelector('.room-bottom-panel__lock-close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(stage.querySelector('.room-bottom-panel__lock-popup')?.hidden).toBe(true);
  });
});

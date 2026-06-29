/* @vitest-environment jsdom */

import fs from 'node:fs';

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
    expect(
      brewingTab?.querySelector('.room-bottom-panel__tab-lock-icon--whole')?.dataset
        .assetAtlasFrame,
    ).toBe('status:lockDefault');

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

  it('breaks the lock icon when a locked tab unlocks', () => {
    vi.useFakeTimers();

    try {
      const stage = document.createElement('section');
      const manager = new BottomPanelViewManager({
        getCurrentPageId: () => 'workshop',
      });

      manager.mount(stage);
      manager.setPageStates([
        {
          id: 'garden',
          unlocked: false,
          requiredLevel: 2,
        },
      ]);

      const gardenTab = stage.querySelector(
        '.room-bottom-panel__tab[data-page-id="garden"]',
      );

      expect(gardenTab?.classList.contains('is-locked')).toBe(true);

      manager.setPageStates([{ id: 'garden', unlocked: true, visible: true }]);

      expect(gardenTab?.classList.contains('is-locked')).toBe(false);
      expect(gardenTab?.classList.contains('is-unlocking')).toBe(true);

      const event = new window.Event('animationend', { bubbles: true });
      Object.defineProperty(event, 'animationName', {
        value: 'room-bottom-tab-lock-break',
      });
      gardenTab?.dispatchEvent(event);

      expect(gardenTab?.classList.contains('is-unlocking')).toBe(false);
      expect(gardenTab?.dataset.unlockAnimationToken).toBeUndefined();

      vi.runOnlyPendingTimers();
    } finally {
      vi.useRealTimers();
    }
  });

  it('defines bottom-tab lock break motion with reduced-motion fallback', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');

    expect(baseCss).toContain('@keyframes room-bottom-tab-lock-break');
    expect(baseCss).toContain('@keyframes room-bottom-tab-lock-left-break');
    expect(baseCss).toContain('@keyframes room-bottom-tab-lock-right-break');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.room-bottom-panel__tab\.is-unlocking \.room-bottom-panel__tab-lock[\s\S]*animation:\s*none;/,
    );
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.room-bottom-panel__tab\.is-unlocking \.room-bottom-panel__tab-lock\s*\{[\s\S]*opacity:\s*0;/,
    );
  });

  it('keeps bottom chrome transparent while tabs keep button surfaces', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
    const panelResetIndex = baseCss.lastIndexOf('.style-panel.room-bottom-panel');
    const themedPanelFrameIndex = baseCss.lastIndexOf(
      ':root[data-style-theme="midnight"]\n  :where(\n    .style-panel,',
    );
    const panelResetBlock = baseCss.slice(
      panelResetIndex,
      baseCss.indexOf('}', panelResetIndex) + 1,
    );
    const tabBlockIndex = baseCss.indexOf('.room-bottom-panel__tab {');
    const tabBlock = baseCss.slice(tabBlockIndex, baseCss.indexOf('}', tabBlockIndex) + 1);

    expect(panelResetIndex).toBeGreaterThan(themedPanelFrameIndex);
    expect(panelResetBlock).toContain('background: transparent;');
    expect(panelResetBlock).toContain('border-image: none;');
    expect(tabBlock).toContain('background: var(--style-surface);');
  });

  it('lets midnight bottom tabs use only their 9-slice fill background', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
    const tabFrameIndex = baseCss.indexOf(
      ':root[data-style-theme="midnight"] .room-bottom-panel__tab,',
    );
    const tabFrameBlock = baseCss.slice(
      tabFrameIndex,
      baseCss.indexOf('}', tabFrameIndex) + 1,
    );
    const lockedFrameIndex = baseCss.indexOf(
      ':root[data-style-theme="midnight"] .room-bottom-panel__tab.is-locked,',
    );
    const lockedFrameBlock = baseCss.slice(
      lockedFrameIndex,
      baseCss.indexOf('}', lockedFrameIndex) + 1,
    );

    expect(tabFrameBlock).toContain('background: transparent;');
    expect(tabFrameBlock).toContain(
      'border-image-source: var(--style-midnight-button-frame);',
    );
    expect(tabFrameBlock).toContain(
      'border-image-slice: var(--style-midnight-frame-slice);',
    );
    expect(lockedFrameBlock).toContain(
      'border-image-source: var(--style-midnight-button-disabled-frame);',
    );
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

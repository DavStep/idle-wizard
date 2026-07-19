/* @vitest-environment jsdom */

import fs from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { FEATURE_UNLOCK_FLYOUT_EVENT } from '../../announcements/featureUnlockEvents.js';
import { BottomPanelViewManager } from './BottomPanelViewManager.js';

async function waitForMutationObserver() {
  await Promise.resolve();
  await Promise.resolve();
}

function installElementAnimationMock() {
  const prototype = window.HTMLElement.prototype;
  const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, 'animate');
  const animation = {
    cancel: vi.fn(),
    finished: new Promise(() => {}),
  };
  const animate = vi.fn(() => animation);

  Object.defineProperty(prototype, 'animate', {
    configurable: true,
    value: animate,
  });

  return {
    animate,
    animation,
    restore() {
      if (originalDescriptor) {
        Object.defineProperty(prototype, 'animate', originalDescriptor);
        return;
      }

      delete prototype.animate;
    },
  };
}

function setUnlockFlyoutGeometry(stage, tab) {
  const iconFrame = tab?.querySelector('.room-bottom-panel__tab-icon-frame');
  stage.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: 1080,
    height: 2170,
  });
  tab.getBoundingClientRect = () => ({
    left: 400,
    top: 1900,
    width: 100,
    height: 80,
  });
  iconFrame.getBoundingClientRect = () => ({
    left: 425,
    top: 1912,
    width: 50,
    height: 50,
  });
}

describe('BottomPanelViewManager', () => {
  it('renders bottom tab icons as decorative button art', () => {
    const stage = document.createElement('section');
    const manager = new BottomPanelViewManager({
      getCurrentPageId: () => 'workshop',
    });

    manager.mount(stage);

    const brewingTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="brewing"]',
    );
    const workshopTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="workshop"]',
    );
    const gardenTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="garden"]',
    );
    const researchTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="research"]',
    );
    const marketTab = stage.querySelector(
      '.room-bottom-panel__tab[data-page-id="shop"]',
    );
    const brewingIconFrame = brewingTab?.querySelector(
      '.room-bottom-panel__tab-icon-frame',
    );
    const brewingIcon = brewingTab?.querySelector('.room-bottom-panel__tab-icon');
    const workshopIconFrame = workshopTab?.querySelector(
      '.room-bottom-panel__tab-icon-frame',
    );
    const workshopIcon = workshopTab?.querySelector('.room-bottom-panel__tab-icon');
    const gardenIconFrame = gardenTab?.querySelector(
      '.room-bottom-panel__tab-icon-frame',
    );
    const gardenIcon = gardenTab?.querySelector('.room-bottom-panel__tab-icon');
    const researchIconFrame = researchTab?.querySelector(
      '.room-bottom-panel__tab-icon-frame',
    );
    const researchIcon = researchTab?.querySelector('.room-bottom-panel__tab-icon');
    const marketIconFrame = marketTab?.querySelector(
      '.room-bottom-panel__tab-icon-frame',
    );
    const marketIcon = marketTab?.querySelector('.room-bottom-panel__tab-icon');

    expect(brewingIconFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(brewingIcon?.tagName).toBe('IMG');
    expect(brewingIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(brewingIcon?.getAttribute('alt')).toBe('');
    expect(brewingIcon?.getAttribute('src')).toContain(
      'icon-brewing-cauldron-tab.webp',
    );
    expect(workshopIconFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(workshopIcon?.tagName).toBe('IMG');
    expect(workshopIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(workshopIcon?.getAttribute('alt')).toBe('');
    expect(workshopIcon?.getAttribute('src')).toContain(
      'icon-workshop-house-tab.webp',
    );
    expect(gardenIconFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(gardenIcon?.tagName).toBe('IMG');
    expect(gardenIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(gardenIcon?.getAttribute('alt')).toBe('');
    expect(gardenIcon?.getAttribute('src')).toContain(
      'icon-garden-plot-tab.webp',
    );
    expect(researchIconFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(researchIcon?.tagName).toBe('IMG');
    expect(researchIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(researchIcon?.getAttribute('alt')).toBe('');
    expect(researchIcon?.getAttribute('src')).toContain(
      'icon-research-telescope-tab.webp',
    );
    expect(marketIconFrame?.getAttribute('aria-hidden')).toBe('true');
    expect(marketIcon?.tagName).toBe('IMG');
    expect(marketIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(marketIcon?.getAttribute('alt')).toBe('');
    expect(marketIcon?.getAttribute('src')).toContain(
      'icon-shop-market-stall-tab.webp',
    );
    expect(brewingTab?.querySelector('.room-bottom-panel__tab-label')?.textContent).toBe(
      'brewing',
    );
    expect(workshopTab?.querySelector('.room-bottom-panel__tab-label')?.textContent).toBe(
      'workshop',
    );
    expect(gardenTab?.querySelector('.room-bottom-panel__tab-label')?.textContent).toBe(
      'garden',
    );
    expect(researchTab?.querySelector('.room-bottom-panel__tab-label')?.textContent).toBe(
      'research',
    );
    expect(marketTab?.querySelector('.room-bottom-panel__tab-label')?.textContent).toBe(
      'market',
    );
  });

  it('keeps bottom tab icons from changing bottom-tab height', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
    const tabRuleIndex = baseCss.indexOf('.room-bottom-panel__tab {');
    const tabRule = baseCss.slice(tabRuleIndex, baseCss.indexOf('}', tabRuleIndex) + 1);
    const iconFrameRuleIndex = baseCss.indexOf('.room-bottom-panel__tab-icon-frame {');
    const iconFrameRule = baseCss.slice(
      iconFrameRuleIndex,
      baseCss.indexOf('}', iconFrameRuleIndex) + 1,
    );
    const labelRuleIndex = baseCss.indexOf('.room-bottom-panel__tab-label {');
    const labelRule = baseCss.slice(
      labelRuleIndex,
      baseCss.indexOf('}', labelRuleIndex) + 1,
    );
    const iconRuleIndex = baseCss.indexOf('.room-bottom-panel__tab-icon {');
    const iconRule = baseCss.slice(iconRuleIndex, baseCss.indexOf('}', iconRuleIndex) + 1);
    const selectedRuleIndex = baseCss.indexOf('.room-bottom-panel__tab.is-selected {');
    const selectedRule = baseCss.slice(
      selectedRuleIndex,
      baseCss.indexOf('}', selectedRuleIndex) + 1,
    );
    const tabScrollClearance = baseCss.match(
      /--style-page-tab-scroll-clearance:\s*calc\(([\s\S]*?)\);/,
    )?.[1];

    expect(tabRule).toContain('min-height: var(--style-page-tab-button-height);');
    expect(tabRule).toContain('padding: 1px 2px;');
    expect(tabRule).toContain('box-sizing: border-box;');
    expect(tabRule).toContain('flex: 0 0 var(--room-bottom-panel-tab-width);');
    expect(baseCss).toContain('--style-page-tab-icon-size: calc(38px * 1.3);');
    expect(baseCss).toContain('--style-page-tab-selected-icon-scale: 1.2;');
    expect(baseCss).toContain('--style-page-tab-icon-y-offset: 10px;');
    expect(baseCss).toContain('--style-page-tab-label-y-offset: 7px;');
    expect(baseCss).toContain('--style-page-tab-label-text-stroke-width: 1px;');
    expect(baseCss).toContain(
      '--style-page-tab-label-text-stroke-color: var(--style-surface);',
    );
    expect(tabScrollClearance).not.toContain('style-page-tab-icon');
    expect(labelRule).toContain('translate: 0 var(--style-page-tab-label-y-offset);');
    expect(labelRule).toContain(
      '-webkit-text-stroke: var(--style-page-tab-label-text-stroke-width)',
    );
    expect(labelRule).toContain('paint-order: stroke fill;');
    expect(labelRule).toContain(
      'text-shadow: var(--style-page-tab-label-text-stroke-shadow);',
    );
    expect(iconFrameRule).toContain(
      'bottom: calc(50% - var(--style-page-tab-icon-center-offset));',
    );
    expect(iconFrameRule).toContain(
      'translate: -50% calc(10% + var(--style-page-tab-icon-y-offset));',
    );
    expect(iconFrameRule).toContain('scale: var(--style-page-tab-current-icon-scale, 1);');
    expect(iconFrameRule).not.toContain('top:');
    expect(iconRule).toContain('scale: var(--style-page-tab-icon-art-scale, 1);');
    expect(baseCss).toContain('--style-page-tab-icon-art-scale: 0.68;');
    expect(baseCss).toContain('--style-page-tab-icon-art-scale: 1.09;');
    expect(baseCss).toContain('--style-page-tab-icon-art-scale: 1.16;');
    expect(baseCss).toContain('--style-page-tab-icon-art-scale: 0.76;');
    expect(selectedRule).toContain(
      '--style-page-tab-current-icon-scale: var(--style-page-tab-selected-icon-scale);',
    );
    expect(selectedRule).toContain('font-weight: 400;');
    expect(selectedRule).not.toContain('font-weight: 700;');
  });

  it('centers unlocked optional room tabs on wrapped bottom-tab rows', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
    const tabsRuleIndex = baseCss.indexOf('.room-bottom-panel__tabs {');
    const tabsRule = baseCss.slice(
      tabsRuleIndex,
      baseCss.indexOf('}', tabsRuleIndex) + 1,
    );

    expect(tabsRule).toContain('--room-bottom-panel-tab-width: calc((100% - 24px) / 5);');
    expect(tabsRule).toContain('display: flex;');
    expect(tabsRule).toContain('flex-wrap: wrap;');
    expect(tabsRule).toContain('justify-content: center;');
  });

  it('stacks bottom chrome above normal chrome and below modal layers', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');
    const readRule = (selector) => {
      const ruleIndex = baseCss.indexOf(selector);
      expect(ruleIndex).toBeGreaterThanOrEqual(0);
      return baseCss.slice(ruleIndex, baseCss.indexOf('}', ruleIndex) + 1);
    };
    const readZIndex = (selector) => {
      const zIndex = readRule(selector).match(/\bz-index:\s*(\d+);/)?.[1];
      expect(zIndex).toBeDefined();
      return Number(zIndex);
    };

    const bottomLayerZIndex = readZIndex('.room-bottom-panel-layer {');

    expect(bottomLayerZIndex).toBeGreaterThan(readZIndex('.room-top-panel-layer {'));
    expect(bottomLayerZIndex).toBeGreaterThan(readZIndex('.room-world-chat-layer {'));
    expect(readZIndex('.room-page__popup-layer {')).toBeGreaterThan(bottomLayerZIndex);
    expect(readZIndex('.room-top-panel-layer:has(')).toBeGreaterThan(bottomLayerZIndex);
    expect(readZIndex('.room-world-chat-layer:has(')).toBeGreaterThan(bottomLayerZIndex);
    expect(readZIndex('.room-bottom-panel-layer:has(')).toBeGreaterThan(
      bottomLayerZIndex,
    );
  });

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

  it('flies one feature icon into its slot when a locked tab unlocks', () => {
    vi.useFakeTimers();
    const animationMock = installElementAnimationMock();

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
      setUnlockFlyoutGeometry(stage, gardenTab);

      expect(gardenTab?.classList.contains('is-locked')).toBe(true);

      manager.setPageStates([{ id: 'garden', unlocked: true, visible: true }]);

      expect(gardenTab?.classList.contains('is-locked')).toBe(false);
      expect(gardenTab?.classList.contains('is-receiving-unlock-icon')).toBe(true);
      expect(document.querySelectorAll('.room-feature-unlock-flyout')).toHaveLength(1);
      expect(
        document.querySelector('.room-feature-unlock-flyout img')?.getAttribute('src'),
      ).toContain('icon-garden-plot-tab.webp');
      expect(animationMock.animate).toHaveBeenCalledTimes(1);
      const [keyframes, options] = animationMock.animate.mock.calls[0];
      expect(keyframes).toHaveLength(11);
      expect(keyframes.at(-1)?.transform).toContain('translate3d(425.0px, 1912.0px, 0)');
      expect(options).toMatchObject({ duration: 520, easing: 'linear', fill: 'both' });

      vi.runOnlyPendingTimers();
      expect(document.querySelector('.room-feature-unlock-flyout')).toBeNull();
      expect(gardenTab?.classList.contains('is-receiving-unlock-icon')).toBe(false);
    } finally {
      vi.runOnlyPendingTimers();
      animationMock.restore();
      vi.useRealTimers();
    }
  });

  it('uses the unlock announcement as the flyout origin without duplicating the icon', async () => {
    vi.useFakeTimers();
    const animationMock = installElementAnimationMock();

    try {
      const stage = document.createElement('section');
      const announcement = document.createElement('section');
      const manager = new BottomPanelViewManager({
        getCurrentPageId: () => 'workshop',
      });

      manager.mount(stage);
      announcement.className = 'room-announcement-layer';
      announcement.hidden = false;
      stage.append(announcement);
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
      setUnlockFlyoutGeometry(stage, gardenTab);

      manager.setPageStates([{ id: 'garden', unlocked: true, visible: true }]);

      expect(document.querySelector('.room-feature-unlock-flyout')).toBeNull();

      announcement.dispatchEvent(
        new window.CustomEvent(FEATURE_UNLOCK_FLYOUT_EVENT, {
          bubbles: true,
          detail: {
            pageIds: ['garden'],
            sourceRect: { left: 490, top: 700, width: 100, height: 100 },
          },
        }),
      );

      expect(document.querySelectorAll('.room-feature-unlock-flyout')).toHaveLength(1);
      expect(animationMock.animate).toHaveBeenCalledTimes(1);
      expect(animationMock.animate.mock.calls[0][0][0]?.transform).toContain(
        'translate3d(515.0px, 725.0px, 0)',
      );

      announcement.hidden = true;
      await waitForMutationObserver();
      expect(animationMock.animate).toHaveBeenCalledTimes(1);
    } finally {
      vi.runOnlyPendingTimers();
      animationMock.restore();
      vi.useRealTimers();
    }
  });

  it('falls back to the stage origin when an announcement clears without a handoff', async () => {
    vi.useFakeTimers();
    const animationMock = installElementAnimationMock();

    try {
      const stage = document.createElement('section');
      const announcement = document.createElement('section');
      const manager = new BottomPanelViewManager({
        getCurrentPageId: () => 'workshop',
      });

      manager.mount(stage);
      announcement.className = 'room-announcement-layer';
      announcement.hidden = false;
      stage.append(announcement);
      manager.setPageStates([
        {
          id: 'shop',
          unlocked: false,
          requiredLevel: 1,
        },
      ]);

      const marketTab = stage.querySelector(
        '.room-bottom-panel__tab[data-page-id="shop"]',
      );
      setUnlockFlyoutGeometry(stage, marketTab);

      manager.setPageStates([{ id: 'shop', unlocked: true, visible: true }]);

      expect(animationMock.animate).not.toHaveBeenCalled();

      announcement.hidden = true;
      await waitForMutationObserver();

      expect(animationMock.animate).toHaveBeenCalledTimes(1);
      expect(document.querySelectorAll('.room-feature-unlock-flyout')).toHaveLength(1);
    } finally {
      vi.runOnlyPendingTimers();
      animationMock.restore();
      vi.useRealTimers();
    }
  });

  it('flies a workshop feature icon into its feature slot', () => {
    vi.useFakeTimers();
    const animationMock = installElementAnimationMock();

    try {
      const stage = document.createElement('section');
      const featureButton = document.createElement('button');
      featureButton.className = 'workshop-page__leaderboard-button';
      const iconFrame = document.createElement('span');
      iconFrame.className = 'workshop-page__leaderboard-button-icon-frame';
      const icon = document.createElement('img');
      icon.src = '/feature-leaderboard.webp';
      iconFrame.append(icon);
      featureButton.append(iconFrame);
      stage.append(featureButton);

      const manager = new BottomPanelViewManager({
        getCurrentPageId: () => 'workshop',
      });
      manager.mount(stage);
      iconFrame.getBoundingClientRect = () => ({
        left: 80,
        top: 380,
        width: 46,
        height: 46,
      });

      stage.dispatchEvent(
        new window.CustomEvent(FEATURE_UNLOCK_FLYOUT_EVENT, {
          bubbles: true,
          detail: {
            features: [{ value: 'leaderboard', pageId: null }],
            pageIds: [],
            sourceRect: { left: 490, top: 700, width: 100, height: 100 },
          },
        }),
      );

      expect(document.querySelectorAll('.room-feature-unlock-flyout')).toHaveLength(1);
      expect(
        document.querySelector('.room-feature-unlock-flyout img')?.getAttribute('src'),
      ).toContain('feature-leaderboard.webp');
      expect(featureButton.classList.contains('is-receiving-unlock-icon')).toBe(true);
      expect(animationMock.animate).toHaveBeenCalledTimes(1);
    } finally {
      vi.runOnlyPendingTimers();
      animationMock.restore();
      vi.useRealTimers();
    }
  });

  it('styles a single fixed icon flyout with a reduced-motion fallback', () => {
    const baseCss = fs.readFileSync('src/styles/base.css', 'utf8');

    expect(baseCss).toContain('.room-feature-unlock-flyout {');
    expect(baseCss).toContain('will-change: transform, opacity;');
    expect(baseCss).not.toContain('@keyframes room-bottom-tab-lock-break');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.room-feature-unlock-flyout\s*\{[\s\S]*display:\s*none;/,
    );
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.is-receiving-unlock-icon[\s\S]*visibility:\s*visible;/,
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

  it('lets midnight bottom tabs use the box 9-slice without an extra panel fill', () => {
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
    const selectedFrameIndex = baseCss.indexOf(
      ':root[data-style-theme="midnight"] .room-bottom-panel__tab.is-selected {',
    );
    const selectedFrameBlock = baseCss.slice(
      selectedFrameIndex,
      baseCss.indexOf('}', selectedFrameIndex) + 1,
    );

    expect(fs.existsSync('public/ui/player-card-panel-selected-9slice.png')).toBe(true);
    expect(baseCss).toContain(
      '--style-midnight-panel-selected-frame: url("/ui/player-card-panel-selected-9slice.png");',
    );
    expect(tabFrameBlock).toContain('background: transparent;');
    expect(tabFrameBlock).toContain(
      'border-image-source: var(--style-midnight-panel-frame);',
    );
    expect(tabFrameBlock).toContain(
      'border-image-slice: var(--style-midnight-frame-slice);',
    );
    expect(lockedFrameBlock).toContain(
      'border-image-source: var(--style-midnight-panel-frame);',
    );
    expect(selectedFrameBlock).toContain(
      'border-image-source: var(--style-midnight-panel-selected-frame);',
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

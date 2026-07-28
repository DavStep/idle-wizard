// @vitest-environment jsdom

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { NineSliceSprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_SWIPE_ORDER } from '../../../../pages/managers/pageOrder.js';
import { SemanticTargetRegistry } from '../../retained/index.js';
import {
  PIXI_BOTTOM_PANEL_TABS,
  PixiBottomPanelView,
} from './PixiBottomPanelView.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';

installPixiPageTestCanvas();

describe('PixiBottomPanelView', () => {
  it('uses the canonical prestige-first page order', () => {
    expect(PIXI_BOTTOM_PANEL_TABS.map(({ id }) => id)).toEqual(
      DEFAULT_PAGE_SWIPE_ORDER,
    );
    expect(
      PIXI_BOTTOM_PANEL_TABS.slice(0, 6).map(({ id }) => id),
    ).toEqual([
      'prestige',
      'brewing',
      'garden',
      'workshop',
      'research',
      'shop',
    ]);
    expect(PIXI_BOTTOM_PANEL_TABS[0]).toMatchObject({
      id: 'prestige',
      icon: 'icon-prestige-star.png',
      artScale: 0.9,
    });
  });

  it('retains all tabs and changes page state in place', () => {
    const showPage = vi.fn();
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      semanticRegistry,
    });
    const tabs = [...view.tabs];

    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: [
        { id: 'workshop', visible: true, unlocked: true },
        { id: 'guild', visible: true, unlocked: true },
      ],
      actions: { showPage },
    });

    expect(view.tabs).toEqual(tabs);
    expect(
      view.tabs.find((tab) => tab.definition.id === 'guild').root.visible,
    ).toBe(true);
    semanticRegistry.activate('page.guild');
    expect(showPage).toHaveBeenCalledWith('guild');
  });

  it('lays out fixed five, six, and seven-tab rows with a wider selection', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.layout({
      sourceHeight: 723.333333,
      sourceScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: 1080,
    });

    for (const visibleIds of [
      ['brewing', 'garden', 'workshop', 'research', 'shop'],
      [
        'prestige',
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
      ],
      [
        'prestige',
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
        'guild',
      ],
    ]) {
      view.bind({
        currentPageId: 'workshop',
        pages: pageStates(visibleIds),
      });

      const visibleTabs = view.tabs.filter((tab) => tab.root.visible);
      const expectedBaseWidth =
        (360 + 2.888889 * (visibleIds.length - 1) - 6) /
        visibleIds.length;
      expect(visibleTabs.map(({ definition }) => definition.id)).toEqual(
        visibleIds,
      );
      expect(view.tabsRoot.position.x).toBe(0);
      expect(view.tabsRoot.position.y).toBeCloseTo(
        723.333333 - 82,
        6,
      );
      let expectedX = 0;
      for (const tab of visibleTabs) {
        const expectedWidth =
          tab.definition.id === 'workshop'
            ? expectedBaseWidth + 6
            : expectedBaseWidth;
        expect(tab.root.position.y).toBe(0);
        expect(tab.width).toBeCloseTo(expectedWidth, 6);
        expect(tab.root.hitArea.width).toBeCloseTo(expectedWidth, 6);
        expect(tab.root.hitArea.height).toBe(82);
        expect(tab.root.position.x).toBeCloseTo(expectedX, 6);
        expectedX += expectedWidth - 2.888889;
        expect(tab.compactIcons).toBe(visibleIds.length >= 7);
      }
      const last = visibleTabs.at(-1);
      expect(last.root.position.x + last.width).toBeCloseTo(360, 6);
    }
  });

  it('reduces every room icon when seven tabs share the row', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: pageStates([
        'prestige',
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
        'guild',
      ]),
    });

    const visibleTabs = view.tabs.filter((tab) => tab.root.visible);
    const workshop = getTab(view, 'workshop');
    const garden = getTab(view, 'garden');

    expect(visibleTabs).toHaveLength(7);
    expect(visibleTabs.every((tab) => tab.compactIcons)).toBe(true);
    expect(workshop.iconFrame.scale.x).toBe(1);
    expect(garden.iconFrame.scale.x).toBe(1.05);
    expect(workshop.root.hitArea.height).toBe(82);
    expect(garden.lock.width).toBe(26);

    view.destroy();
  });

  it('matches active and inactive frame, icon, and selected-label geometry', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
      ]),
    });

    const workshop = getTab(view, 'workshop');
    const brewing = getTab(view, 'brewing');
    const research = getTab(view, 'research');
    const shop = getTab(view, 'shop');

    expect(workshop.frame.mode).toBe('active');
    expect(workshop.frame.textureId).toBe(
      'source:assets/ui/midnight-room-tab-top-cap-selected-9slice.png',
    );
    expect(workshop.frame.sprite).toBeInstanceOf(NineSliceSprite);
    expect(workshop.frame.sprite.leftWidth).toBe(83);
    expect(workshop.frame.sprite.topHeight).toBe(91);
    expect(workshop.frame.sprite.rightWidth).toBe(73);
    expect(workshop.frame.sprite.bottomHeight).toBe(1);
    expect(workshop.frame.sprite.scale.x).toBe(0.5);
    expect(workshop.frame.sprite.scale.y).toBe(0.5);
    expect(workshop.frame.frameY).toBe(0);
    expect(workshop.frame.frameHeight).toBe(82);
    expect(
      workshop.frame.sprite.width * workshop.frame.sprite.scale.x,
    ).toBeCloseTo(workshop.width, 6);
    expect(
      workshop.frame.sprite.height * workshop.frame.sprite.scale.y,
    ).toBe(82);
    expect(workshop.labelRoot.visible).toBe(true);
    expect(workshop.text.text).toBe('Workshop');
    expect(workshop.text.textObject.style.fill).toBe('#ffffff');
    expect(workshop.labelRoot.position.y + workshop.text.measuredHeight / 2)
      .toBeCloseTo(54, 6);
    expect(workshop.iconFrame.position.y).toBe(28);
    expect(workshop.iconFrame.scale.x).toBe(1.5);
    expect(workshop.icon.width).toBeCloseTo(50 * 0.84, 6);

    expect(brewing.frame.mode).toBe('inactive');
    expect(brewing.frame.textureId).toBe(
      'source:assets/ui/midnight-room-tab-top-cap-9slice.png',
    );
    expect(brewing.frame.frameY).toBe(12);
    expect(brewing.frame.frameHeight).toBe(70);
    expect(
      brewing.frame.sprite.width * brewing.frame.sprite.scale.x,
    ).toBeCloseTo(brewing.width, 6);
    expect(
      brewing.frame.sprite.height * brewing.frame.sprite.scale.y,
    ).toBe(70);
    expect(brewing.labelRoot.visible).toBe(false);
    expect(brewing.iconFrame.position.y).toBe(40);
    expect(brewing.iconFrame.scale.x).toBe(1.5);
    expect(brewing.iconFrame.alpha).toBe(1);
    expect(brewing.icon.width).toBeCloseTo(50 * 0.72, 6);
    expect(research.icon.width).toBeCloseTo(50 * 0.84, 6);
    expect(shop.icon.width).toBeCloseTo(50 * 0.9, 6);
  });

  it('lifts the selected icon during the retained tab motion', () => {
    const motion = createMotionClock();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
    });
    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
      ]),
    });

    const workshop = getTab(view, 'workshop');
    const research = getTab(view, 'research');
    const tabRoots = [...view.tabs];

    view.bind({
      currentPageId: 'research',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
      ]),
    });

    expect(view.tabs).toEqual(tabRoots);
    expect(workshop.motionRoot.scale.x).toBe(1);
    expect(research.motionRoot.pivot.x).toBeCloseTo(
      research.width / 2,
      6,
    );
    expect(research.motionRoot.pivot.y).toBe(82);
    expect(research.iconFrame.position.y).toBe(40);
    expect(research.iconFrame.scale.x).toBe(1.5);
    motion.step(205 * 0.25);
    expect(research.iconFrame.position.y).toBeGreaterThan(28);
    expect(research.iconFrame.position.y).toBeLessThan(40);
    expect(research.iconFrame.scale.x).toBe(1.5);
    motion.step(205 * 0.68);
    expect(research.motionRoot.scale.x).toBeCloseTo(1.065, 5);
    motion.step(205);
    expect(research.motionRoot.scale.x).toBe(1);
    expect(research.iconFrame.position.y).toBe(28);
    expect(research.iconFrame.scale.x).toBe(1.5);
    expect(view.getMotionStats().frameScheduled).toBe(false);

    view.destroy();
  });

  it('prehighlights an unlocked swipe target without raising it', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: [
        ...pageStates([
          'brewing',
          'workshop',
          'research',
          'shop',
        ]),
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
    });

    const research = getTab(view, 'research');
    const garden = getTab(view, 'garden');

    expect(view.setSwipeTargetPageId('research')).toBe(true);
    expect(research.frame.mode).toBe('active');
    expect(research.frame.frameY).toBe(12);
    expect(research.frame.frameHeight).toBe(70);
    expect(research.iconFrame.scale.x).toBe(1.5);
    expect(research.labelRoot.visible).toBe(false);

    expect(view.setSwipeTargetPageId('garden')).toBe(true);
    expect(research.frame.mode).toBe('inactive');
    expect(garden.state.swipeTarget).toBe(true);
    expect(garden.frame.mode).toBe('inactive');
    expect(garden.frame.filters).toEqual([garden.frame.lockedFilter]);

    expect(view.setSwipeTargetPageId(null)).toBe(true);
    expect(garden.state.swipeTarget).toBe(false);
    view.destroy();
  });

  it('shows only the lock artwork on locked room tabs', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: [
        ...pageStates(['workshop']),
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
    });

    const garden = getTab(view, 'garden');

    expect(garden.iconFrame.visible).toBe(false);
    expect(garden.iconFrame.renderable).toBe(false);
    expect(garden.lock.visible).toBe(true);
    expect(garden.lock.renderable).toBe(true);
    expect(garden.lock.width).toBe(26);
    expect(garden.lock.height).toBe(29.5);
    expect(garden.lock.position.y).toBe(32);

    view.bind({
      currentPageId: 'workshop',
      pages: pageStates(['workshop', 'garden']),
    });

    expect(garden.iconFrame.visible).toBe(true);
    expect(garden.iconFrame.renderable).toBe(true);
    expect(garden.lock.visible).toBe(false);
    expect(garden.lock.renderable).toBe(false);
    view.destroy();
  });

  it('bumps a locked swipe target before showing its retained notice', () => {
    const motion = createMotionClock();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
    });
    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: false,
          requiredLevel: 2,
        },
      ],
    });

    const garden = getTab(view, 'garden');

    expect(view.showLockedPage('garden')).toBe(true);
    motion.step(140 * 0.55);
    expect(garden.motionRoot.position.y).toBeCloseTo(81, 5);
    motion.step(140);
    expect(garden.motionRoot.position.y).toBe(82);
    expect(view.lockLayer.visible).toBe(true);

    view.destroy();
  });

  it('defers, pools, and reuses feature-unlock icon flyouts', () => {
    const motion = createMotionClock();
    let blocked = true;
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
      isUnlockAnimationBlocked: () => blocked,
    });
    view.activate();
    view.layout({
      sourceHeight: 723.333333,
      sourceScale: 3,
      uiScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: 1080,
    });
    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
    });
    const garden = getTab(view, 'garden');
    const tabRoot = garden.root;
    const iconFrame = garden.iconFrame;

    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: true,
        },
      ],
    });
    motion.step(16);
    expect(view.getMotionStats()).toMatchObject({
      pendingUnlocks: 1,
      activeUnlocks: 0,
    });
    expect(iconFrame.visible).toBe(true);
    expect(
      view.setFeatureUnlockSource('garden', {
        x: 330,
        y: 600,
        width: 186,
        height: 192,
      }),
    ).toBe(true);

    blocked = false;
    motion.step(32);
    const flyout = view.unlockFlyoutLayer.children[0];
    expect(view.getMotionStats()).toMatchObject({
      pendingUnlocks: 0,
      activeUnlocks: 1,
      unlockPool: {
        allocated: 1,
        active: 1,
        highWaterMark: 1,
      },
    });
    expect(garden.root).toBe(tabRoot);
    expect(iconFrame.visible).toBe(false);
    expect(flyout.position.x).toBe(141);
    expect(flyout.position.y).toBe(232);

    motion.step(292);
    expect(flyout.position.x).not.toBe(141);
    expect(flyout.position.y).not.toBe(232);
    motion.step(552);
    expect(iconFrame.visible).toBe(true);
    expect(view.getMotionStats()).toMatchObject({
      activeUnlocks: 0,
      unlockPool: {
        allocated: 1,
        acquired: 1,
        available: 1,
      },
    });

    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
    });
    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: true,
        },
      ],
    });
    motion.step(568);
    expect(view.unlockFlyoutLayer.children[0]).toBe(flyout);
    motion.step(1088);
    expect(view.getMotionStats().unlockPool).toMatchObject({
      allocated: 1,
      acquired: 2,
      available: 1,
      highWaterMark: 1,
    });

    view.destroy();
  });

  it('settles tab motion immediately when reduced motion is requested', () => {
    const motion = createMotionClock();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      reducedMotion: true,
      requestFrame: motion.requestFrame,
      cancelFrame: motion.cancelFrame,
      timeSource: motion.timeSource,
    });
    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: [
        ...pageStates([
          'brewing',
          'workshop',
          'research',
          'shop',
        ]),
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
    });
    view.bind({
      currentPageId: 'research',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'research',
        'shop',
      ]),
    });

    const research = getTab(view, 'research');
    const garden = getTab(view, 'garden');
    expect(research.motionRoot.scale.x).toBe(1);
    expect(garden.iconFrame.visible).toBe(true);
    expect(view.getMotionStats()).toMatchObject({
      frameScheduled: false,
      pendingUnlocks: 0,
      activeUnlocks: 0,
    });

    view.showLockedPage('garden', {
      id: 'garden',
      visible: true,
      unlocked: false,
    });
    expect(garden.motionRoot.position.y).toBe(82);
    expect(motion.requestFrame).not.toHaveBeenCalled();
    view.destroy();
  });

  it('uses retained image notifications at the selected and inactive anchors', () => {
    const assets = createAssets();
    const view = new PixiBottomPanelView({ assets });
    view.bind({
      currentPageId: 'workshop',
      pages: [
        ...pageStates([
          'brewing',
          'garden',
          'workshop',
          'research',
          'shop',
        ]).filter(({ id }) => id !== 'garden'),
        {
          id: 'garden',
          visible: true,
          unlocked: false,
        },
      ],
      notifications: {
        workshop: { tone: 'red' },
        brewing: { tone: 'orange' },
        garden: { tone: 'red' },
      },
    });

    const workshop = getTab(view, 'workshop');
    const brewing = getTab(view, 'brewing');
    const garden = getTab(view, 'garden');

    expect(workshop.notification.root.visible).toBe(true);
    expect(workshop.notification.sprite.texture).toBe(assets.textures.red);
    expect(workshop.notification.root.parent).toBe(view.notificationsRoot);
    expect(view.notificationsRoot.zIndex).toBeGreaterThan(workshop.root.zIndex);
    expect(
      workshop.notification.root.x +
        workshop.notification.sprite.width / 2 -
        (workshop.layoutX + workshop.width),
    ).toBeCloseTo(-4, 6);
    expect(
      workshop.notification.root.y -
        workshop.notification.sprite.height / 2,
    ).toBeCloseTo(4, 6);
    expect(workshop.notification.sprite.width).toBe(12);
    expect(workshop.notification.sprite.height).toBe(12);

    expect(brewing.notification.root.visible).toBe(true);
    expect(brewing.notification.sprite.texture).toBe(assets.textures.orange);
    expect(
      brewing.notification.root.y -
        brewing.notification.sprite.height / 2,
    ).toBeCloseTo(16, 6);
    expect(garden.notification.root.visible).toBe(false);
  });

  it('marks selected presses silent and keeps locked presses tappable but inactive', () => {
    const inputRouter = createInputRouter();
    const showPage = vi.fn();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      inputRouter,
    });
    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: [
        ...pageStates([
          'brewing',
          'workshop',
          'research',
          'shop',
        ]),
        {
          id: 'garden',
          visible: true,
          unlocked: false,
          lockedMessage: 'garden needs more power',
        },
      ],
      actions: { showPage },
    });

    const workshopPress = inputRouter.registrations.get('page.workshop');
    const brewingPress = inputRouter.registrations.get('page.brewing');
    const gardenPress = inputRouter.registrations.get('page.garden');
    const marketPress = inputRouter.registrations.get('page.shop');
    const garden = getTab(view, 'garden');
    const brewing = getTab(view, 'brewing');

    expect(workshopPress.selected()).toBe(true);
    expect(marketPress.fallbackHitTest).toBe(true);

    brewingPress.onPressChange(true);
    expect(brewing.frame.mode).toBe('active');
    expect(brewing.frame.frameY).toBe(12);
    expect(brewing.frame.frameHeight).toBe(70);
    brewingPress.onPressChange(false);
    expect(brewing.frame.mode).toBe('inactive');

    gardenPress.onPressChange(true);
    expect(garden.frame.mode).toBe('inactive');
    expect(garden.root.eventMode).toBe('static');
    expect(gardenPress.onActivate()).toBe(true);
    expect(view.lockLayer.visible).toBe(true);
    expect(view.lockMessage.text).toBe('garden needs more power');
    expect(showPage).not.toHaveBeenCalled();
  });

  it('uses the retained locked-room popup for locked pages', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.activate();
    view.bind({
      currentPageId: 'workshop',
      pages: [
        {
          id: 'garden',
          visible: true,
          unlocked: false,
          requiredLevel: 2,
        },
      ],
    });

    expect(view.showLockedPage('garden')).toBe(true);
    expect(view.lockPanel).toBeInstanceOf(PixiDialogFrame);
    expect(view.lockLayer.visible).toBe(true);
    expect(view.lockMessage.text).toBe('Garden unlocks at level 2');
    view.hideLockedPage();
    expect(view.lockLayer.visible).toBe(false);
  });
});

function createAssets() {
  const textures = {
    active: Texture.WHITE,
    inactive: Texture.EMPTY,
    red: Texture.WHITE,
    orange: Texture.EMPTY,
  };
  return {
    loaded: true,
    textures,
    getTexture: vi.fn((assetId) => {
      if (assetId.endsWith('midnight-room-tab-top-cap-selected-9slice.png')) {
        return textures.active;
      }
      if (assetId.endsWith('midnight-room-tab-top-cap-9slice.png')) {
        return textures.inactive;
      }
      if (assetId.endsWith('notification-circle-red.png')) {
        return textures.red;
      }
      if (assetId.endsWith('notification-circle-orange.png')) {
        return textures.orange;
      }
      return Texture.EMPTY;
    }),
    getAtlasTexture: () => Texture.EMPTY,
  };
}

function pageStates(visibleIds) {
  const visible = new Set(visibleIds);
  return PIXI_BOTTOM_PANEL_TABS.map(({ id }) => ({
    id,
    visible: visible.has(id),
    unlocked: true,
  }));
}

function getTab(view, pageId) {
  return view.tabs.find(({ definition }) => definition.id === pageId);
}

function createInputRouter() {
  const registrations = new Map();
  return {
    registrations,
    registerPressTarget: vi.fn((descriptor) => {
      registrations.set(descriptor.id, descriptor);
      return { unregister: vi.fn() };
    }),
    pushModal: vi.fn(() => ({ unregister: vi.fn() })),
  };
}

function createMotionClock() {
  let now = 0;
  let sequence = 0;
  const frames = new Map();
  return {
    requestFrame: vi.fn((callback) => {
      const id = ++sequence;
      frames.set(id, callback);
      return id;
    }),
    cancelFrame: vi.fn((frameId) => {
      frames.delete(frameId);
    }),
    timeSource: () => now,
    step(nextNow) {
      now = nextNow;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) {
        callback(now);
      }
    },
  };
}

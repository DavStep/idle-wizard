// @vitest-environment jsdom

import { installPixiPageTestCanvas } from '../../pages/workshop/PixiPageTestHarness.js';
import { NineSliceSprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_SWIPE_ORDER } from '../../../../pages/managers/pageOrder.js';
import { SemanticTargetRegistry } from '../../retained/index.js';
import {
  PIXI_ALLIANCE_HUD_TABS,
  PIXI_BOTTOM_PANEL_TABS,
  PIXI_GUILD_HUD_TABS,
  PIXI_PRESTIGE_HUD_TABS,
  PixiBottomRoomTab,
  PixiBottomPanelView,
} from './PixiBottomPanelView.js';
import { PixiDialogFrame } from '../../primitives/PixiDialogFrame.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

installPixiPageTestCanvas();

describe('PixiBottomPanelView', () => {
  it('keeps alternate HUD destinations out of normal room navigation', () => {
    expect(PIXI_BOTTOM_PANEL_TABS.map(({ id }) => id)).toEqual(
      DEFAULT_PAGE_SWIPE_ORDER.filter(
        (id) => !['alliance', 'guild', 'prestige'].includes(id),
      ),
    );
    expect(PIXI_BOTTOM_PANEL_TABS.slice(0, 5).map(({ id }) => id)).toEqual([
      'brewing',
      'garden',
      'workshop',
      'shop',
      'research',
    ]);
    expect(PIXI_GUILD_HUD_TABS.map(({ icon }) => icon)).toEqual([
      'icon-workshop-house-tab.png',
      'icon-guild-hall-tab.png',
      'icon-guild-adventurers-tab.png',
      'icon-guild-fishers-tab.png',
      'icon-guild-miners-tab.png',
      'icon-guild-world-tab.png',
    ]);
    expect(PIXI_PRESTIGE_HUD_TABS.map(({ id }) => id)).toEqual([
      'prestige.workshop',
      'prestige.main',
      'prestige.points',
    ]);
    expect(PIXI_PRESTIGE_HUD_TABS.map(({ icon }) => icon)).toEqual([
      'icon-workshop-house-tab.png',
      'icon-prestige-main-tab.png',
      'icon-prestige-points-tab.png',
    ]);
    expect(PIXI_ALLIANCE_HUD_TABS.map(({ id }) => id)).toEqual([
      'alliance.workshop',
      'alliance.browse',
      'alliance.create',
      'alliance.home',
      'alliance.quests',
      'alliance.requests',
      'alliance.settings',
    ]);
    expect(PIXI_ALLIANCE_HUD_TABS.map(({ icon }) => icon)).toEqual([
      'icon-workshop-house-tab.png',
      undefined,
      undefined,
      'icon-alliance-home-tab.png',
      'icon-alliance-quests-tab.png',
      'icon-alliance-requests-tab.png',
      'icon-alliance-settings-tab.png',
    ]);
  });

  it('retains room and Guild HUD tabs while switching navigation modes', () => {
    const showPage = vi.fn();
    const selectGuildTab = vi.fn();
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      semanticRegistry,
    });
    const tabs = [...view.tabs];
    const guildTabs = [...view.guildTabs];

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
    expect(view.guildTabs).toEqual(guildTabs);
    expect(view.tabs.every((tab) => tab instanceof PixiBottomRoomTab)).toBe(
      true,
    );
    expect(view.tabs.some((tab) => tab.definition.id === 'guild')).toBe(false);
    expect(view.guildTabs.every((tab) => tab.root.visible === false)).toBe(true);

    view.bind({
      currentPageId: 'guild',
      guildHud: { selectedTabId: 'hall' },
      hudMode: 'guild',
      pages: [{ id: 'workshop', visible: true, unlocked: true }],
      actions: { selectGuildTab, showPage },
    });

    expect(view.tabs.every((tab) => tab.root.visible === false)).toBe(true);
    expect(view.guildTabs.map((tab) => tab.root.visible)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(view.guildTabs.every(
      (tab) => tab instanceof PixiBottomRoomTab,
    )).toBe(true);
    expect(view.guildTabs.every((tab) => tab.icon !== null)).toBe(true);
    semanticRegistry.activate('guild.tab.adventurers');
    expect(selectGuildTab).toHaveBeenCalledWith('adventurers');
    semanticRegistry.activate('guild.tab.fishers');
    expect(selectGuildTab).not.toHaveBeenCalledWith('fishers');
    expect(view.lockLayer.visible).toBe(true);
    expect(view.lockMessage.text).toBe(
      "Fishers' Lodge is not available yet",
    );
    semanticRegistry.activate('guild.return.workshop');
    expect(showPage).toHaveBeenCalledWith('workshop');
  });

  it('uses icon-backed Guild tabs and keeps locked destinations explicit', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'guild',
      guildHud: {
        selectedTabId: 'adventurers',
        notifications: { adventurers: { active: true, tone: 'red' } },
      },
      hudMode: 'guild',
      pages: [{ id: 'workshop', visible: true, unlocked: true }],
    });

    const hall = view.guildTabs.find(
      (tab) => tab.definition.guildTabId === 'hall',
    );
    const adventurers = view.guildTabs.find(
      (tab) => tab.definition.guildTabId === 'adventurers',
    );
    const fishers = view.guildTabs.find(
      (tab) => tab.definition.guildTabId === 'fishers',
    );

    expect(hall.labelRoot.visible).toBe(false);
    expect(hall.iconFrame.visible).toBe(true);
    expect(adventurers.labelRoot.visible).toBe(true);
    expect(adventurers.iconFrame.visible).toBe(true);
    expect(adventurers.frame.mode).toBe('active');
    expect(adventurers.notification.root.visible).toBe(true);
    expect(fishers.state.unlocked).toBe(false);
    expect(fishers.lock.visible).toBe(true);
    expect(fishers.iconFrame.visible).toBe(false);
    expect(fishers.lock.position.y).toBe(32);
    expect(fishers.labelRoot.visible).toBe(false);
  });

  it('switches Prestige to Workshop return plus Main and Points icon tabs', () => {
    const showPage = vi.fn();
    const selectPrestigeTab = vi.fn();
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      semanticRegistry,
    });

    view.bind({
      currentPageId: 'prestige',
      hudMode: 'prestige',
      prestigeHud: { selectedTabId: 'main' },
      pages: [{ id: 'workshop', visible: true, unlocked: true }],
      actions: { selectPrestigeTab, showPage },
    });

    expect(view.tabs.every((tab) => tab.root.visible === false)).toBe(true);
    expect(view.guildTabs.every((tab) => tab.root.visible === false)).toBe(true);
    expect(view.prestigeTabs.map((tab) => tab.root.visible)).toEqual([
      true,
      true,
      true,
    ]);
    expect(view.prestigeTabs.every(
      (tab) => tab instanceof PixiBottomRoomTab,
    )).toBe(true);
    expect(view.prestigeTabs.every((tab) => tab.icon !== null)).toBe(true);
    expect(view.prestigeTabs[1].state.selected).toBe(true);
    expect(view.prestigeTabs[2].state.selected).toBe(false);

    semanticRegistry.activate('prestige.tab.points');
    expect(selectPrestigeTab).toHaveBeenCalledWith('points');
    semanticRegistry.activate('prestige.return.workshop');
    expect(showPage).toHaveBeenCalledWith('workshop');

    view.destroy();
  });

  it('switches Alliance to its permitted icon tabs without a Chat destination', () => {
    const selectAllianceTab = vi.fn();
    const semanticRegistry = new SemanticTargetRegistry();
    const view = new PixiBottomPanelView({
      assets: createAssets(),
      semanticRegistry,
    });

    view.bind({
      allianceHud: {
        notifications: { requests: true },
        selectedTabId: 'home',
        tabs: [
          { id: 'home', visible: true, unlocked: true },
          { id: 'quests', visible: true, unlocked: true },
          { id: 'requests', visible: true, unlocked: true },
          { id: 'settings', visible: false, unlocked: true },
        ],
      },
      currentPageId: 'alliance',
      hudMode: 'alliance',
      pages: [{ id: 'workshop', visible: true, unlocked: true }],
      actions: { selectAllianceTab },
    });

    expect(
      view.allianceTabs
        .filter((tab) => tab.root.visible)
        .map((tab) => tab.definition.id),
    ).toEqual([
      'alliance.workshop',
      'alliance.home',
      'alliance.quests',
      'alliance.requests',
    ]);
    expect(view.allianceTabs[3].state.selected).toBe(true);
    expect(view.allianceTabs[5].notification.root.visible).toBe(true);
    expect(
      view.allianceTabs
        .filter((tab) => tab.root.visible)
        .every((tab) => tab.icon !== null),
    ).toBe(true);
    expect(view.allianceTabs[3].labelRoot.visible).toBe(true);
    expect(view.allianceTabs[4].labelRoot.visible).toBe(false);

    expect(semanticRegistry.has('page.alliance.chat')).toBe(false);
    expect(selectAllianceTab).not.toHaveBeenCalled();

    view.destroy();
  });

  it('lays out fixed five, six, and seven-tab rows with a wider selection', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.layout({
      sourceHeight: PIXI_UI_GEOMETRY.sourceHeight,
      sourceScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
    });

    for (const visibleIds of [
      ['brewing', 'garden', 'workshop', 'shop', 'research'],
      [
        'brewing',
        'garden',
        'workshop',
        'shop',
        'research',
        'advancedBrewing',
      ],
      [
        'brewing',
        'garden',
        'workshop',
        'shop',
        'research',
        'advancedBrewing',
        'advancedGarden',
      ],
    ]) {
      view.bind({
        currentPageId: 'workshop',
        pages: pageStates(visibleIds),
      });

      const visibleTabs = view.tabs.filter((tab) => tab.root.visible);
      const expectedBaseWidth =
        (PIXI_UI_GEOMETRY.sourceWidth +
          2.888889 * (visibleIds.length - 1) -
          6) /
        visibleIds.length;
      expect(visibleTabs.map(({ definition }) => definition.id)).toEqual(
        visibleIds,
      );
      expect(view.tabsRoot.position.x).toBe(0);
      expect(view.tabsRoot.position.y).toBeCloseTo(
        PIXI_UI_GEOMETRY.sourceHeight - 82,
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
      expect(last.root.position.x + last.width).toBeCloseTo(
        PIXI_UI_GEOMETRY.sourceWidth,
        6,
      );
    }
  });

  it('reduces every room icon when seven tabs share the row', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'shop',
        'research',
        'advancedBrewing',
        'advancedGarden',
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
        'shop',
        'research',
      ]),
    });

    const workshop = getTab(view, 'workshop');
    const brewing = getTab(view, 'brewing');
    const research = getTab(view, 'research');
    const shop = getTab(view, 'shop');

    expect(workshop.frame.mode).toBe('active');
    expect(workshop.frame.textureId).toBe(
      'source:assets/ui/midnight-room-tab-top-cap-selected.9.png',
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
      'source:assets/ui/midnight-room-tab-top-cap.9.png',
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

  it('recolors the retained active and inactive tab frames for Day', () => {
    const view = new PixiBottomPanelView({ assets: createAssets() });
    view.bind({
      currentPageId: 'workshop',
      pages: pageStates([
        'brewing',
        'garden',
        'workshop',
        'shop',
        'research',
      ]),
    });

    view.applyTheme(createPixiThemeSnapshot({ theme: 'day' }));

    expect(getTab(view, 'workshop').frame.textureId).toBe(
      PIXI_ROOT_RUN_ASSETS.roomTabActiveDay,
    );
    expect(getTab(view, 'brewing').frame.textureId).toBe(
      PIXI_ROOT_RUN_ASSETS.roomTabInactiveDay,
    );

    view.destroy();
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
        'shop',
        'research',
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
        'shop',
        'research',
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
          'shop',
          'research',
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
      sourceHeight: PIXI_UI_GEOMETRY.sourceHeight,
      sourceScale: 3,
      uiScale: 3,
      sourceOffsetX: 0,
      stageLogicalWidth: PIXI_UI_GEOMETRY.authoredWidth,
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
          'shop',
          'research',
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
        'shop',
        'research',
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
          'shop',
          'research',
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
          'shop',
          'research',
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
      if (assetId.endsWith('midnight-room-tab-top-cap-selected.9.png')) {
        return textures.active;
      }
      if (assetId.endsWith('midnight-room-tab-top-cap.9.png')) {
        return textures.inactive;
      }
      if (assetId.endsWith('day-room-tab-top-cap-selected.9.png')) {
        return textures.active;
      }
      if (assetId.endsWith('day-room-tab-top-cap.9.png')) {
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

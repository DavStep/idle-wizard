import {
  ColorMatrixFilter,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  BasePixiRetainedView,
  normalizePixiTextStroke,
  PixiDialogFrame,
  PixiTextLabel,
} from '../../primitives/index.js';
import { PixiNotificationBadge } from '../transient/PixiNotificationBadges.js';
import { WidgetPool } from '../../retained/WidgetPool.js';
import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';
import { DEFAULT_PAGE_SWIPE_ORDER } from '../../../../pages/managers/pageOrder.js';

const TAB_DEFINITIONS = Object.freeze({
  brewing: Object.freeze({
    id: 'brewing',
    label: 'Brewing',
    icon: 'icon-brewing-cauldron-tab.png',
    artScale: 0.72,
  }),
  garden: Object.freeze({
    id: 'garden',
    label: 'Garden',
    icon: 'icon-garden-plot-tab.png',
    artScale: 1,
  }),
  workshop: Object.freeze({
    id: 'workshop',
    label: 'Workshop',
    icon: 'icon-workshop-house-tab.png',
    artScale: 0.84,
  }),
  research: Object.freeze({
    id: 'research',
    label: 'Research',
    icon: 'icon-research-telescope-tab.png',
    artScale: 0.84,
  }),
  shop: Object.freeze({
    id: 'shop',
    label: 'Market',
    icon: 'icon-shop-market-stall-tab.png',
    artScale: 0.9,
  }),
  advancedBrewing: Object.freeze({
    id: 'advancedBrewing',
    label: 'Adv Brewing',
  }),
  advancedGarden: Object.freeze({
    id: 'advancedGarden',
    label: 'Adv Garden',
  }),
  guild: Object.freeze({ id: 'guild', label: 'Guild' }),
  advancedMarket: Object.freeze({
    id: 'advancedMarket',
    label: 'Adv Market',
  }),
});

export const PIXI_BOTTOM_PANEL_TABS = Object.freeze(
  DEFAULT_PAGE_SWIPE_ORDER
    .filter((pageId) => !['alliance', 'guild', 'prestige'].includes(pageId))
    .map((pageId) => TAB_DEFINITIONS[pageId]),
);

export const PIXI_ALLIANCE_HUD_TABS = Object.freeze([
  Object.freeze({
    id: 'alliance.workshop',
    pageId: 'workshop',
    label: 'Workshop',
    icon: 'icon-workshop-house-tab.png',
    artScale: 0.84,
    semanticId: 'alliance.return.workshop',
  }),
  Object.freeze({ id: 'alliance.browse', allianceTabId: 'browse', label: 'Browse' }),
  Object.freeze({ id: 'alliance.create', allianceTabId: 'create', label: 'Create' }),
  Object.freeze({
    id: 'alliance.home',
    allianceTabId: 'home',
    label: 'Home',
    icon: 'icon-alliance-home-tab.png',
    artScale: 0.72,
  }),
  Object.freeze({
    id: 'alliance.quests',
    allianceTabId: 'quests',
    label: 'Quests',
    icon: 'icon-alliance-quests-tab.png',
    artScale: 0.78,
  }),
  Object.freeze({
    id: 'alliance.requests',
    allianceTabId: 'requests',
    label: 'Requests',
    icon: 'icon-alliance-requests-tab.png',
    artScale: 0.7,
  }),
  Object.freeze({
    id: 'alliance.settings',
    allianceTabId: 'settings',
    label: 'Settings',
    icon: 'icon-alliance-settings-tab.png',
    artScale: 0.72,
  }),
]);

export const PIXI_GUILD_HUD_TABS = Object.freeze([
  Object.freeze({
    id: 'guild.workshop',
    pageId: 'workshop',
    label: 'Workshop',
    icon: 'icon-workshop-house-tab.png',
    artScale: 0.84,
    semanticId: 'guild.return.workshop',
    tutorialId: 'guild:return:workshop',
  }),
  Object.freeze({
    id: 'guild.hall',
    guildTabId: 'hall',
    label: 'Hall',
    icon: 'icon-guild-hall-tab.png',
    artScale: 0.72,
    semanticId: 'guild.tab.hall',
    tutorialId: 'guild:tab:hall',
    defaultUnlocked: true,
  }),
  Object.freeze({
    id: 'guild.adventurers',
    guildTabId: 'adventurers',
    label: 'Adventurers',
    icon: 'icon-guild-adventurers-tab.png',
    artScale: 0.78,
    semanticId: 'guild.tab.adventurers',
    tutorialId: 'guild:tab:adventurers',
    defaultUnlocked: true,
  }),
  Object.freeze({
    id: 'guild.fishers',
    guildTabId: 'fishers',
    label: 'Fishers',
    icon: 'icon-guild-fishers-tab.png',
    artScale: 0.78,
    semanticId: 'guild.tab.fishers',
    tutorialId: 'guild:tab:fishers',
    defaultUnlocked: false,
    lockedMessage: "Fishers' Lodge is not available yet",
  }),
  Object.freeze({
    id: 'guild.miners',
    guildTabId: 'miners',
    label: 'Miners',
    icon: 'icon-guild-miners-tab.png',
    artScale: 0.78,
    semanticId: 'guild.tab.miners',
    tutorialId: 'guild:tab:miners',
    defaultUnlocked: false,
    lockedMessage: "Miners' Lodge is not available yet",
  }),
  Object.freeze({
    id: 'guild.world',
    guildTabId: 'world',
    label: 'World',
    icon: 'icon-guild-world-tab.png',
    artScale: 0.82,
    semanticId: 'guild.tab.world',
    tutorialId: 'guild:tab:world',
    defaultUnlocked: false,
    lockedMessage: 'Guild World is not available yet',
  }),
]);

export const PIXI_PRESTIGE_HUD_TABS = Object.freeze([
  Object.freeze({
    id: 'prestige.workshop',
    pageId: 'workshop',
    label: 'Workshop',
    icon: 'icon-workshop-house-tab.png',
    artScale: 0.84,
    semanticId: 'prestige.return.workshop',
    tutorialId: 'prestige:return:workshop',
  }),
  Object.freeze({
    id: 'prestige.main',
    prestigeTabId: 'main',
    label: 'Main',
    icon: 'icon-prestige-main-tab.png',
    artScale: 0.84,
    semanticId: 'prestige.tab.main',
    tutorialId: 'prestige:tab:main',
  }),
  Object.freeze({
    id: 'prestige.points',
    prestigeTabId: 'points',
    label: 'Points',
    icon: 'icon-prestige-points-tab.png',
    artScale: 0.9,
    semanticId: 'prestige.tab.points',
    tutorialId: 'prestige:tab:points',
  }),
]);

const DEFAULT_TAB_IDS = new Set([
  'brewing',
  'garden',
  'workshop',
  'research',
  'shop',
]);
const PANEL_X = 0;
const PANEL_WIDTH = PIXI_UI_GEOMETRY.sourceWidth;
const PANEL_BOTTOM = 0;
const TAB_ACTIVE_HEIGHT = 56;
const TAB_INACTIVE_HEIGHT = 44;
const TAB_RISE = TAB_ACTIVE_HEIGHT - TAB_INACTIVE_HEIGHT;
const TAB_OVERLAP = 2.888889;
const TAB_BOTTOM_BLEED = 26;
const TAB_HEIGHT = TAB_ACTIVE_HEIGHT + TAB_BOTTOM_BLEED;
const TAB_SELECTED_WIDTH_EXTRA = 6;
const TAB_ICON_SIZE = 50;
const TAB_ICON_TOP = 3;
const TAB_ICON_SELECTED_SCALE = 1.5;
const TAB_ICON_INACTIVE_SCALE = 1.5;
const TAB_COMPACT_ICON_THRESHOLD = 7;
const TAB_ICON_COMPACT_SELECTED_SCALE = 1;
const TAB_ICON_COMPACT_INACTIVE_SCALE = 1.05;
const TAB_LOCK_WIDTH = 26;
const TAB_LOCK_HEIGHT = 29.5;
const TAB_LOCK_CENTER_Y = 32;
const TAB_SELECTED_MOTION_MS = 205;
const TAB_SELECTED_PEAK_AT = 0.68;
const TAB_SELECTED_PEAK_SCALE = 1.065;
const TAB_SWIPE_BUMP_MS = 140;
const TAB_SWIPE_BUMP_PEAK_AT = 0.55;
const TAB_SWIPE_BUMP_Y = -1;
const FEATURE_UNLOCK_FLYOUT_MS = 520;
const FEATURE_UNLOCK_POOL_SIZE = 5;
export const PIXI_ROOM_TAB_FRAME_STATES = Object.freeze({
  active: Object.freeze({
    textureId:
      'source:assets/ui/midnight-room-tab-top-cap-selected.9.png',
  }),
  inactive: Object.freeze({
    textureId:
      'source:assets/ui/midnight-room-tab-top-cap.9.png',
  }),
});
export const PIXI_ROOM_TAB_FRAME_SLICE = Object.freeze({
  leftWidth: 83,
  topHeight: 91,
  rightWidth: 73,
  bottomHeight: 1,
});
export const PIXI_ROOM_TAB_FRAME_SCALE = 0.5;
const LABEL_SHADOW_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: -1, y: 0 }),
]);

export class PixiBottomPanelView extends BasePixiRetainedView {
  constructor({
    assets,
    inputRouter,
    semanticRegistry,
    counters = null,
    reducedMotion = prefersReducedMotion,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    isUnlockAnimationBlocked = () => false,
  } = {}) {
    super({ label: 'bottomPanel' });
    this.assets = assets;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.reducedMotion =
      typeof reducedMotion === 'function'
        ? reducedMotion
        : () => Boolean(reducedMotion);
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.isUnlockAnimationBlocked =
      typeof isUnlockAnimationBlocked === 'function'
        ? isUnlockAnimationBlocked
        : () => false;
    this.actions = {};
    this.model = {};
    this.pageStates = new Map();
    this.swipeTargetPageId = null;
    this.modalHandle = null;
    this.motionFrame = 0;
    this.pendingUnlockTabs = new Set();
    this.activeUnlockFlyouts = new Map();
    this.unlockSourceBoundsByPageId = new Map();
    this.handleMotionFrame = (timestamp) => {
      this.motionFrame = 0;
      this.updateMotion(
        Number.isFinite(timestamp) ? timestamp : this.timeSource(),
      );
    };

    this.tabsRoot = new Container();
    this.tabsRoot.label = 'bottomPanel:tabs';
    this.tabsRoot.sortableChildren = true;
    this.notificationsRoot = new Container();
    this.notificationsRoot.label = 'bottomPanel:notifications';
    this.notificationsRoot.eventMode = 'none';
    this.notificationsRoot.zIndex = 10;
    this.tabs = PIXI_BOTTOM_PANEL_TABS.map(
      (definition) =>
        new PixiBottomRoomTab({
          definition,
          assets,
          inputRouter,
          semanticRegistry,
          notificationLayer: this.notificationsRoot,
          onActivate: (tab) => this.activateTab(tab),
        }),
    );
    this.guildTabs = PIXI_GUILD_HUD_TABS.map((definition) => {
      return new PixiBottomRoomTab({
        definition,
        assets,
        inputRouter,
        semanticRegistry,
        notificationLayer: this.notificationsRoot,
        onActivate: (tab) => this.activateTab(tab),
      });
    });
    this.prestigeTabs = PIXI_PRESTIGE_HUD_TABS.map((definition) => {
      return new PixiBottomRoomTab({
        definition,
        assets,
        inputRouter,
        semanticRegistry,
        notificationLayer: this.notificationsRoot,
        onActivate: (tab) => this.activateTab(tab),
      });
    });
    this.allianceTabs = PIXI_ALLIANCE_HUD_TABS.map((definition) => {
      const TabClass = definition.icon
        ? PixiBottomRoomTab
        : PixiBottomHudTextTab;
      return new TabClass({
        definition,
        assets,
        inputRouter,
        semanticRegistry,
        notificationLayer: this.notificationsRoot,
        onActivate: (tab) => this.activateTab(tab),
      });
    });
    this.allTabs = [
      ...this.tabs,
      ...this.guildTabs,
      ...this.prestigeTabs,
      ...this.allianceTabs,
    ];
    this.tabsRoot.addChild(
      ...this.allTabs.map((tab) => tab.root),
      this.notificationsRoot,
    );

    this.lockBackdrop = new Graphics();
    this.lockBackdrop.label = 'bottomPanel:lockBackdrop';
    this.lockBackdrop.eventMode = 'static';
    this.lockPanel = new PixiDialogFrame({
      assetManager: assets,
      inputRouter,
      semanticRegistry,
      closeSemanticId: 'bottomPanel.lock.close',
      title: 'Locked',
      coreWidth: 230,
      coreHeight: 78,
      closeAction: () => this.hideLockedPage(),
      label: 'bottomPanel:lockPanel',
    });
    this.lockPanel.setContentBoxSize(
      190,
      38,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.lockMessage = new PixiTextLabel({
      text: '',
      wrapWidth: 190,
      wordWrap: true,
      label: 'bottomPanel:lockMessage',
    });
    this.lockPanel.content.addChild(this.lockMessage);
    this.lockLayer = new Container();
    this.lockLayer.label = 'bottomPanel:lockLayer';
    this.lockLayer.visible = false;
    this.lockLayer.renderable = false;
    this.lockLayer.eventMode = 'none';
    this.lockLayer.addChild(
      this.lockBackdrop,
      this.lockPanel,
    );
    this.unlockFlyoutLayer = new Container();
    this.unlockFlyoutLayer.label = 'bottomPanel:unlockFlyouts';
    this.unlockFlyoutLayer.eventMode = 'none';
    this.unlockFlyoutPool = new WidgetPool({
      name: 'Pixi bottom-tab unlock flyouts',
      counters,
      maxSize: FEATURE_UNLOCK_POOL_SIZE,
      create: () =>
        new FeatureUnlockFlyoutWidget({
          parent: this.unlockFlyoutLayer,
        }),
      reset: (widget) => widget.reset(),
      dispose: (widget) => widget.destroy(),
    });

    this.root.addChild(
      this.tabsRoot,
      this.lockLayer,
      this.unlockFlyoutLayer,
    );
    this.applyTheme(DEFAULT_PIXI_THEME_SNAPSHOT);
    this.onBind({ reveal: { rooms: false }, pages: [] });
  }

  onBind(viewModel = {}) {
    this.model = viewModel;
    this.actions = viewModel.actions ?? {};
    this.pageStates = new Map(
      (viewModel.pages ?? []).map((page) => [page.id, page]),
    );
    const notifications = viewModel.notifications ?? {};
    const currentPageId = viewModel.currentPageId ?? 'workshop';
    const revealRooms = viewModel.reveal?.rooms !== false;
    const hudMode = ['alliance', 'guild', 'prestige'].includes(viewModel.hudMode)
      ? viewModel.hudMode
      : 'rooms';
    const guildHud = viewModel.guildHud ?? {};
    const selectedGuildTabId = guildHud.selectedTabId ?? 'hall';
    const guildNotifications = guildHud.notifications ?? {};
    const guildTabStates = new Map(
      (guildHud.tabs ?? []).map((state) => [state.id, state]),
    );
    if (
      Object.prototype.hasOwnProperty.call(
        viewModel,
        'swipeTargetPageId',
      )
    ) {
      this.swipeTargetPageId =
        typeof viewModel.swipeTargetPageId === 'string'
          ? viewModel.swipeTargetPageId
          : null;
    }

    for (const tab of this.tabs) {
      const tabId = tab.definition.id;
      const state = this.pageStates.get(tabId) ?? {
        id: tabId,
        unlocked: true,
        visible: DEFAULT_TAB_IDS.has(tabId),
      };
      const wasVisible = tab.root.visible;
      const wasSelected = tab.state.selected === true;
      const wasLocked = tab.state.unlocked === false;
      tab.bind({
        ...state,
        selected: tabId === currentPageId,
        swipeTarget: tabId === this.swipeTargetPageId,
        visible:
          hudMode === 'rooms' &&
          revealRooms &&
          (state.visible !== false) &&
          (DEFAULT_TAB_IDS.has(tabId) || state.visible === true),
        notification: notifications[tabId],
      });
      if (
        tab.state.selected === true &&
        !wasSelected &&
        wasVisible
      ) {
        this.startSelectedMotion(tab);
      } else if (tab.state.selected !== true) {
        tab.cancelSelectedMotion();
      }
      if (
        wasLocked &&
        tab.state.unlocked !== false &&
        tab.root.visible
      ) {
        this.queueUnlockFlyout(tab);
      } else if (
        tab.state.unlocked === false ||
        !tab.root.visible
      ) {
        this.unlockSourceBoundsByPageId.delete(tabId);
        this.cancelUnlockFlyout(tab);
      }
    }
    for (const tab of this.guildTabs) {
      const wasVisible = tab.root.visible;
      const wasSelected = tab.state.selected === true;
      const guildTabId = tab.definition.guildTabId;
      const state = guildTabStates.get(guildTabId) ?? {};
      const unlocked =
        state.unlocked ?? tab.definition.defaultUnlocked !== false;
      tab.bind({
        ...state,
        id: tab.definition.id,
        selected:
          unlocked &&
          Boolean(guildTabId) &&
          guildTabId === selectedGuildTabId,
        unlocked,
        visible: hudMode === 'guild' && revealRooms,
        lockedMessage:
          state.lockedMessage ?? tab.definition.lockedMessage,
        notification: guildTabId
          ? guildNotifications[guildTabId]
          : false,
      });
      if (tab.state.selected === true && !wasSelected && wasVisible) {
        this.startSelectedMotion(tab);
      } else if (tab.state.selected !== true) {
        tab.cancelSelectedMotion();
      }
    }
    const prestigeHud = viewModel.prestigeHud ?? {};
    const selectedPrestigeTabId = prestigeHud.selectedTabId ?? 'main';
    const prestigeNotifications = prestigeHud.notifications ?? {};
    const prestigeTabStates = new Map(
      (prestigeHud.tabs ?? []).map((state) => [state.id, state]),
    );
    for (const tab of this.prestigeTabs) {
      const wasVisible = tab.root.visible;
      const wasSelected = tab.state.selected === true;
      const prestigeTabId = tab.definition.prestigeTabId;
      const state = prestigeTabStates.get(prestigeTabId) ?? {};
      const unlocked = state.unlocked !== false;
      tab.bind({
        ...state,
        id: tab.definition.id,
        selected:
          unlocked &&
          Boolean(prestigeTabId) &&
          prestigeTabId === selectedPrestigeTabId,
        unlocked,
        visible: hudMode === 'prestige' && revealRooms,
        lockedMessage:
          state.lockedMessage ?? tab.definition.lockedMessage,
        notification: prestigeTabId
          ? prestigeNotifications[prestigeTabId]
          : false,
      });
      if (tab.state.selected === true && !wasSelected && wasVisible) {
        this.startSelectedMotion(tab);
      } else if (tab.state.selected !== true) {
        tab.cancelSelectedMotion();
      }
    }
    const allianceHud = viewModel.allianceHud ?? {};
    const selectedAllianceTabId = allianceHud.selectedTabId ?? 'home';
    const allianceNotifications = allianceHud.notifications ?? {};
    const allianceTabStates = new Map(
      (allianceHud.tabs ?? []).map((state) => [state.id, state]),
    );
    for (const tab of this.allianceTabs) {
      const wasVisible = tab.root.visible;
      const wasSelected = tab.state.selected === true;
      const allianceTabId = tab.definition.allianceTabId;
      const state = allianceTabStates.get(allianceTabId) ?? {};
      const unlocked = state.unlocked !== false;
      tab.bind({
        ...state,
        id: tab.definition.id,
        selected:
          unlocked &&
          Boolean(allianceTabId) &&
          allianceTabId === selectedAllianceTabId,
        unlocked,
        visible:
          hudMode === 'alliance' &&
          revealRooms &&
          (allianceTabId ? state.visible === true : true),
        lockedMessage: state.lockedMessage,
        notification: allianceTabId
          ? allianceNotifications[allianceTabId]
          : false,
      });
      if (tab.state.selected === true && !wasSelected && wasVisible) {
        this.startSelectedMotion(tab);
      } else if (tab.state.selected !== true) {
        tab.cancelSelectedMotion();
      }
    }
    this.layoutTabs(this.viewportProjection);
  }

  onApplyTheme(theme) {
    for (const tab of this.allTabs) {
      tab.applyTheme(theme);
    }
    this.lockPanel.applyTheme(theme);
    this.lockMessage.applyTheme(
      this.lockPanel.getContentTheme?.() ?? theme,
    );
    this.redrawBackdrop();
  }

  onLayout(projection) {
    this.layoutTabs(projection);
    this.redrawBackdrop();
    const sourceHeight =
      projection?.sourceHeight ?? PIXI_UI_GEOMETRY.sourceHeight;
    this.lockPanel.position.set(
      (PIXI_UI_GEOMETRY.sourceWidth - this.lockPanel.outerWidth) / 2,
      sourceHeight - 46 - this.lockPanel.outerHeight,
    );
  }

  onDeactivate() {
    this.hideLockedPage();
    this.stopMotion();
    this.pendingUnlockTabs.clear();
    this.unlockSourceBoundsByPageId.clear();
    for (const tab of this.allTabs) {
      this.cancelUnlockFlyout(tab);
      tab.settleMotion();
    }
  }

  onDestroy() {
    this.hideLockedPage();
    this.stopMotion();
    this.pendingUnlockTabs.clear();
    this.unlockSourceBoundsByPageId.clear();
    for (const tab of this.allTabs) {
      this.cancelUnlockFlyout(tab);
    }
    this.unlockFlyoutPool.destroy();
    for (const tab of this.allTabs) {
      tab.destroy();
    }
  }

  activateTab(tab) {
    if (tab.state?.unlocked === false) {
      this.showLockedPage(tab.definition, tab.state, {
        swipeFeedback: false,
      });
      this.actions.onLockedPage?.(tab.definition.id, tab.state);
      return true;
    }
    if (tab.definition.guildTabId) {
      return this.actions.selectGuildTab?.(
        tab.definition.guildTabId,
      ) ?? true;
    }
    if (tab.definition.prestigeTabId) {
      return this.actions.selectPrestigeTab?.(
        tab.definition.prestigeTabId,
      ) ?? true;
    }
    if (tab.definition.allianceTabId) {
      return this.actions.selectAllianceTab?.(
        tab.definition.allianceTabId,
      ) ?? true;
    }
    if (tab.definition.pageId) {
      return this.actions.showPage?.(tab.definition.pageId) ?? true;
    }
    const tabId = tab.definition.id;
    const state = this.pageStates.get(tabId) ?? {};
    if (state.visible === false) {
      return false;
    }
    if (state.unlocked === false) {
      this.showLockedPage(tab.definition, state, {
        swipeFeedback: false,
      });
      this.actions.onLockedPage?.(tabId, state);
      return true;
    }
    return this.actions.showPage?.(tabId) ?? true;
  }

  showLockedPage(
    definitionOrId,
    explicitState = null,
    { swipeFeedback = true } = {},
  ) {
    const definition =
      typeof definitionOrId === 'string'
          ? [
              ...PIXI_BOTTOM_PANEL_TABS,
              ...PIXI_GUILD_HUD_TABS,
              ...PIXI_PRESTIGE_HUD_TABS,
              ...PIXI_ALLIANCE_HUD_TABS,
            ].find((tab) => tab.id === definitionOrId)
        : definitionOrId;
    const state = explicitState ?? this.pageStates.get(definition?.id);
    if (!definition || state?.unlocked !== false) {
      return false;
    }
    if (swipeFeedback) {
      const tab = this.allTabs.find(
        (candidate) => candidate.definition.id === definition.id,
      );
      if (tab) {
        this.startSwipeBump(tab);
      }
    }
    const message =
      state.lockedMessage ??
      (state.requiredLevel
        ? `${definition.label} unlocks at level ${state.requiredLevel}`
        : `${definition.label} is locked`);
    this.lockMessage.setText(message);
    this.lockLayer.visible = true;
    this.lockLayer.renderable = true;
    this.lockLayer.eventMode = 'static';
    this.modalHandle?.unregister?.();
    this.modalHandle =
      this.inputRouter?.pushModal?.({
        id: 'bottomPanel.lock',
        root: this.lockPanel,
        onOutsidePress: () => this.hideLockedPage(),
        onBack: () => this.hideLockedPage(),
        onEscape: () => this.hideLockedPage(),
      }) ?? null;
    return true;
  }

  setSwipeTargetPageId(pageId) {
    const nextPageId =
      typeof pageId === 'string' &&
      this.tabs.some(
        (tab) =>
          tab.definition.id === pageId &&
          tab.root.visible,
      )
        ? pageId
        : null;
    if (this.swipeTargetPageId === nextPageId) {
      return false;
    }
    this.swipeTargetPageId = nextPageId;
    for (const tab of this.tabs) {
      tab.setSwipeTarget(
        tab.definition.id === this.swipeTargetPageId,
      );
    }
    return true;
  }

  setFeatureUnlockSource(pageId, bounds) {
    const tab = this.tabs.find(
      (candidate) => candidate.definition.id === pageId,
    );
    const sourceBounds = projectStageBoundsToSource(
      bounds,
      this.viewportProjection,
    );
    if (!tab || !sourceBounds) {
      return false;
    }
    this.unlockSourceBoundsByPageId.set(pageId, sourceBounds);
    return true;
  }

  startSelectedMotion(tab) {
    if (!this.active || this.reducedMotion()) {
      tab.cancelSelectedMotion();
      return false;
    }
    tab.startSelectedMotion(this.timeSource());
    this.scheduleMotion();
    return true;
  }

  startSwipeBump(tab) {
    if (!this.active || this.reducedMotion()) {
      tab.cancelSwipeBump();
      return false;
    }
    tab.startSwipeBump(this.timeSource());
    this.scheduleMotion();
    return true;
  }

  queueUnlockFlyout(tab) {
    this.cancelUnlockFlyout(tab);
    if (
      !this.active ||
      this.reducedMotion() ||
      !tab.icon
    ) {
      tab.setReceivingUnlock(false);
      return false;
    }
    this.pendingUnlockTabs.add(tab);
    this.scheduleMotion();
    return true;
  }

  startUnlockFlyout(tab, now) {
    if (
      !tab.icon ||
      !tab.root.visible ||
      tab.state.unlocked === false
    ) {
      return false;
    }
    const widget = this.unlockFlyoutPool.acquire();
    const target = {
      x:
        this.tabsRoot.position.x +
        tab.root.position.x +
        tab.iconFrame.position.x,
      y:
        this.tabsRoot.position.y +
        tab.root.position.y +
        tab.iconFrame.position.y,
    };
    const sourceHeight =
      this.viewportProjection?.sourceHeight ??
      PIXI_UI_GEOMETRY.sourceHeight;
    const sourceBounds = this.unlockSourceBoundsByPageId.get(
      tab.definition.id,
    );
    this.unlockSourceBoundsByPageId.delete(tab.definition.id);
    const origin = sourceBounds
      ? {
          x: sourceBounds.x + sourceBounds.width / 2,
          y: sourceBounds.y + sourceBounds.height / 2,
        }
      : {
          x: PIXI_UI_GEOMETRY.sourceWidth / 2,
          y: sourceHeight * 0.44,
        };
    const sourceScale = Math.max(
      1.2,
      Math.min(
        2.2,
        sourceBounds
          ? Math.max(
              sourceBounds.width /
                Math.max(1, tab.icon.width),
              sourceBounds.height /
                Math.max(1, tab.icon.height),
            )
          : Math.max(
              tab.width / TAB_ICON_SIZE,
              TAB_HEIGHT / TAB_ICON_SIZE,
            ),
      ),
    );
    const uiScale =
      this.viewportProjection?.uiScale ??
      this.viewportProjection?.sourceScale ??
      PIXI_UI_GEOMETRY.sourceScale;
    widget.bind({
      texture: tab.icon.texture,
      width: tab.icon.width,
      height: tab.icon.height,
      origin,
      target,
      targetScale: tab.iconFrame.scale.x,
      sourceScale,
      arcHeight: Math.max(
        42 / Math.max(0.0001, uiScale),
        Math.abs(target.x - origin.x) * 0.14,
      ),
    });
    tab.setReceivingUnlock(true);
    this.activeUnlockFlyouts.set(tab, {
      tab,
      widget,
      startMs: now,
    });
    return true;
  }

  cancelUnlockFlyout(tab) {
    this.pendingUnlockTabs.delete(tab);
    const active = this.activeUnlockFlyouts.get(tab);
    if (active) {
      this.activeUnlockFlyouts.delete(tab);
      this.unlockFlyoutPool.release(active.widget);
    }
    tab.setReceivingUnlock(false);
    return Boolean(active);
  }

  updateMotion(now = this.timeSource()) {
    if (!this.active || this.reducedMotion()) {
      this.stopMotion();
      this.pendingUnlockTabs.clear();
      for (const tab of this.allTabs) {
        this.cancelUnlockFlyout(tab);
        tab.settleMotion();
      }
      return false;
    }

    let hasMotion = false;
    for (const tab of this.allTabs) {
      hasMotion = tab.updateMotion(now) || hasMotion;
    }

    if (this.pendingUnlockTabs.size > 0) {
      if (this.isUnlockAnimationBlocked()) {
        hasMotion = true;
      } else {
        for (const tab of this.pendingUnlockTabs) {
          this.startUnlockFlyout(tab, now);
        }
        this.pendingUnlockTabs.clear();
      }
    }

    for (const [tab, active] of this.activeUnlockFlyouts) {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now - active.startMs) /
            FEATURE_UNLOCK_FLYOUT_MS,
        ),
      );
      active.widget.update(progress);
      if (progress >= 1) {
        this.activeUnlockFlyouts.delete(tab);
        tab.setReceivingUnlock(false);
        this.unlockFlyoutPool.release(active.widget);
      } else {
        hasMotion = true;
      }
    }

    if (
      this.pendingUnlockTabs.size > 0 ||
      this.activeUnlockFlyouts.size > 0
    ) {
      hasMotion = true;
    }
    if (hasMotion) {
      this.scheduleMotion();
    }
    return hasMotion;
  }

  scheduleMotion() {
    if (this.motionFrame || !this.active) {
      return;
    }
    this.motionFrame =
      this.requestFrame?.(this.handleMotionFrame) ?? 0;
  }

  stopMotion() {
    if (!this.motionFrame) {
      return;
    }
    this.cancelFrame?.(this.motionFrame);
    this.motionFrame = 0;
  }

  getMotionStats() {
    return Object.freeze({
      frameScheduled: Boolean(this.motionFrame),
      pendingUnlocks: this.pendingUnlockTabs.size,
      activeUnlocks: this.activeUnlockFlyouts.size,
      unlockPool: this.unlockFlyoutPool.getStats(),
    });
  }

  hideLockedPage() {
    const wasVisible = this.lockLayer.visible;
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
    this.lockLayer.visible = false;
    this.lockLayer.renderable = false;
    this.lockLayer.eventMode = 'none';
    return wasVisible;
  }

  layoutTabs(projection) {
    const visibleTabs = this.allTabs.filter((tab) => tab.root.visible);
    const sourceHeight =
      projection?.sourceHeight ?? PIXI_UI_GEOMETRY.sourceHeight;
    this.tabsRoot.position.set(
      PANEL_X,
      sourceHeight - PANEL_BOTTOM - TAB_HEIGHT,
    );

    const selectedTab = visibleTabs.find(
      (tab) => tab.state.selected === true,
    );
    const selectedWidthExtra =
      selectedTab ? TAB_SELECTED_WIDTH_EXTRA : 0;
    const tabWidth =
      visibleTabs.length > 0
        ? (
            PANEL_WIDTH +
            TAB_OVERLAP * Math.max(0, visibleTabs.length - 1) -
            selectedWidthExtra
          ) / visibleTabs.length
        : PANEL_WIDTH;
    let tabX = 0;
    visibleTabs.forEach((tab) => {
      tab.setCompactIcons(
        visibleTabs.length >= TAB_COMPACT_ICON_THRESHOLD,
      );
      const width =
        tab === selectedTab
          ? tabWidth + selectedWidthExtra
          : tabWidth;
      tab.setWidth(width);
      tab.setLayoutX(tabX);
      tabX += width - TAB_OVERLAP;
    });
  }

  redrawBackdrop() {
    const projection = this.viewportProjection;
    const sourceHeight =
      projection?.sourceHeight ?? PIXI_UI_GEOMETRY.sourceHeight;
    const sourceWidth =
      projection
        ? projection.stageLogicalWidth / projection.sourceScale
        : PIXI_UI_GEOMETRY.sourceWidth;
    const sourceOffsetX = projection?.sourceOffsetX ?? 0;
    this.lockBackdrop
      .clear()
      .rect(-sourceOffsetX, 0, sourceWidth, sourceHeight)
      .fill({ color: this.theme?.backdrop ?? '#1c1e26', alpha: 0 });
    this.lockBackdrop.hitArea = new Rectangle(
      -sourceOffsetX,
      0,
      sourceWidth,
      sourceHeight,
    );
  }
}

export class PixiBottomRoomTab {
  constructor({
    definition,
    assets,
    inputRouter,
    semanticRegistry,
    notificationLayer,
    onActivate,
  }) {
    this.definition = definition;
    this.assets = assets;
    this.inputRouter = inputRouter;
    this.semanticRegistry = semanticRegistry;
    this.onActivate = onActivate;
    this.state = {};
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.width = PANEL_WIDTH / 5;
    this.pressed = false;
    this.receivingUnlock = false;
    this.selectedMotion = null;
    this.swipeBumpMotion = null;
    this.selectedScale = 1;
    this.selectedIconProgress = 1;
    this.swipeBumpY = 0;
    this.layoutX = 0;
    this.compactIcons = false;
    this.root = new Container();
    this.root.label = `bottomPanel:tab:${definition.id}`;
    this.root.eventMode = 'static';
    this.root.sortableChildren = true;
    this.root.hitArea = new Rectangle(0, 0, this.width, TAB_HEIGHT);
    this.motionRoot = new Container();
    this.motionRoot.label = `${this.root.label}:motion`;
    this.motionRoot.sortableChildren = true;
    this.frame = new PixiRoomTabFrame({
      assets,
      width: this.width,
      label: `${this.root.label}:frame`,
    });
    this.frame.zIndex = 0;
    this.iconFrame = new Container();
    this.iconFrame.label = `${this.root.label}:iconFrame`;
    this.iconFrame.zIndex = 1;
    this.icon = definition.icon
      ? new Sprite({
          texture: assets.getTexture(
            `source:assets/icons/${definition.icon}`,
          ),
          label: `${this.root.label}:icon`,
          roundPixels: true,
        })
      : null;
    if (this.icon) {
      this.icon.anchor.set(0.5);
      this.icon.position.set(TAB_ICON_SIZE / 2, TAB_ICON_SIZE / 2);
      this.iconFrame.addChild(this.icon);
    }
    this.labelRoot = new Container();
    this.labelRoot.label = `${this.root.label}:label`;
    this.labelRoot.zIndex = 3;
    this.labelShadows = LABEL_SHADOW_OFFSETS.map(({ x, y }, index) => {
      const shadow = createTabLabel({
        text: definition.label,
        color: (theme) => theme.surface,
        label: `${this.root.label}:textShadow:${index}`,
      });
      shadow.position.set(x, y);
      this.labelRoot.addChild(shadow);
      return shadow;
    });
    this.text = new PixiTextLabel({
      text: definition.label,
      fontSize: 11,
      lineHeight: 12,
      align: 'center',
      anchor: { x: 0.5, y: 0.5 },
      color: '#ffffff',
      wordWrap: true,
      wrapWidth: this.width - 4,
      label: `${this.root.label}:text`,
    });
    this.labelRoot.addChild(this.text);
    this.lock = new Sprite({
      texture: assets.getAtlasTexture('status:lockDefault'),
      label: `${this.root.label}:lock`,
      roundPixels: true,
    });
    this.lock.zIndex = 4;
    this.lock.anchor.set(0.5);
    this.lock.width = TAB_LOCK_WIDTH;
    this.lock.height = TAB_LOCK_HEIGHT;
    this.notification = new PixiNotificationBadge({
      assetManager: assets,
    });
    this.notification.root.label = `${this.root.label}:notification`;
    notificationLayer?.addChild?.(this.notification.root);
    this.motionRoot.addChild(
      this.frame,
      this.iconFrame,
      this.labelRoot,
      this.lock,
    );
    this.root.addChild(this.motionRoot);
    const semanticId =
      definition.semanticId ??
      `page.${definition.pageId ?? definition.id}`;
    this.registration =
      inputRouter?.registerPressTarget?.({
        id: semanticId,
        displayObject: this.root,
        enabled: () =>
          this.root.visible &&
          this.root.renderable &&
          this.root.eventMode !== 'none',
        selected: () => this.state.selected === true,
        fallbackHitTest: true,
        excludePageSwipe: true,
        onPressChange: (pressed) => this.setPressed(pressed),
        onActivate: () => this.onActivate?.(this),
        haptic: 'light',
      }) ?? null;
    this.semanticId = semanticId;
    if (!semanticRegistry?.has?.(this.semanticId)) {
      semanticRegistry?.register?.({
        semanticId: this.semanticId,
        tutorialId:
          definition.tutorialId ??
          `page:${definition.pageId ?? definition.id}`,
        displayObject: this.root,
        state: () => ({
          active: !this.root.destroyed,
          visible: this.root.visible && this.root.renderable,
          interactive: this.root.eventMode !== 'none',
          enabled: true,
          selected: this.state.selected === true,
          locked: this.state.unlocked === false,
        }),
        activate: () => this.onActivate?.(this),
      });
    }
    this.layoutIcon();
    this.setWidth(this.width);
  }

  bind(state) {
    this.state = state;
    this.pressed = false;
    this.root.visible = state.visible === true;
    this.root.renderable = this.root.visible;
    this.root.eventMode = this.root.visible ? 'static' : 'none';
    this.root.cursor = state.selected === true ? 'default' : 'pointer';
    this.lock.visible = state.unlocked === false;
    this.lock.renderable = this.lock.visible;
    if (!this.root.visible || this.state.unlocked === false) {
      this.setReceivingUnlock(false);
    }
    this.updateVisualState();
    this.drawNotification(state);
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.applyTheme(this.theme);
    this.text.applyTheme(this.theme);
    this.text.textObject.style.stroke = normalizePixiTextStroke({
      color: this.theme.surface,
    }, this.text.fontSize);
    for (const shadow of this.labelShadows) {
      shadow.applyTheme(this.theme);
    }
  }

  setWidth(width) {
    this.width = Math.max(0, Number(width) || 0);
    this.root.hitArea = new Rectangle(0, 0, this.width, TAB_HEIGHT);
    this.frame.setWidth(this.width);
    this.iconFrame.position.x = this.width / 2;
    this.lock.position.set(
      this.width / 2,
      TAB_LOCK_CENTER_Y,
    );
    this.labelRoot.position.x = this.width / 2;
    for (const label of [...this.labelShadows, this.text]) {
      label.setWrapWidth(Math.max(0, this.width - 4));
    }
    this.layoutLabel();
    this.motionRoot.pivot.set(this.width / 2, TAB_HEIGHT);
    this.applyMotionTransform();
    return this;
  }

  setLayoutX(x) {
    this.layoutX = Number(x) || 0;
    this.root.position.set(this.layoutX, 0);
    this.layoutNotification();
  }

  setCompactIcons(compact) {
    const next = compact === true;
    if (this.compactIcons === next) {
      return;
    }
    this.compactIcons = next;
    this.applyIconLayout();
  }

  layoutIcon() {
    if (!this.icon) {
      return;
    }
    const artScale = this.definition.artScale ?? 1;
    const bounds = this.icon.texture.orig ?? this.icon.texture.frame;
    const aspect =
      bounds?.width > 0 && bounds?.height > 0
        ? bounds.width / bounds.height
        : 1;
    if (aspect >= 1) {
      this.icon.width = TAB_ICON_SIZE * artScale;
      this.icon.height = (TAB_ICON_SIZE / aspect) * artScale;
    } else {
      this.icon.width = TAB_ICON_SIZE * aspect * artScale;
      this.icon.height = TAB_ICON_SIZE * artScale;
    }
    this.iconFrame.pivot.set(TAB_ICON_SIZE / 2, TAB_ICON_SIZE / 2);
  }

  setPressed(pressed) {
    this.pressed =
      pressed === true &&
      this.state.unlocked !== false &&
      this.state.selected !== true;
    this.updateVisualState();
  }

  setSwipeTarget(selected) {
    const swipeTarget = selected === true;
    if (this.state.swipeTarget === swipeTarget) {
      return false;
    }
    this.state = {
      ...this.state,
      swipeTarget,
    };
    this.updateVisualState();
    return true;
  }

  setReceivingUnlock(receiving) {
    const next = receiving === true;
    if (this.receivingUnlock === next) {
      return false;
    }
    this.receivingUnlock = next;
    this.updateVisualState();
    return true;
  }

  startSelectedMotion(startMs) {
    this.selectedMotion = {
      startMs: Number(startMs) || 0,
    };
    this.selectedScale = 1;
    this.selectedIconProgress = 0;
    this.applyIconLayout();
    this.applyMotionTransform();
  }

  cancelSelectedMotion() {
    this.selectedMotion = null;
    this.selectedScale = 1;
    this.selectedIconProgress = 1;
    this.applyIconLayout();
    this.applyMotionTransform();
  }

  startSwipeBump(startMs) {
    this.swipeBumpMotion = {
      startMs: Number(startMs) || 0,
    };
    this.swipeBumpY = 0;
    this.applyMotionTransform();
  }

  cancelSwipeBump() {
    this.swipeBumpMotion = null;
    this.swipeBumpY = 0;
    this.applyMotionTransform();
  }

  settleMotion() {
    this.cancelSelectedMotion();
    this.cancelSwipeBump();
  }

  updateMotion(now) {
    let active = false;
    if (this.selectedMotion) {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now - this.selectedMotion.startMs) /
            TAB_SELECTED_MOTION_MS,
        ),
      );
      this.selectedScale = selectedMotionScale(progress);
      this.selectedIconProgress = easeOutQuart(progress);
      if (progress >= 1) {
        this.selectedMotion = null;
        this.selectedScale = 1;
        this.selectedIconProgress = 1;
      } else {
        active = true;
      }
    }
    if (this.swipeBumpMotion) {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (now - this.swipeBumpMotion.startMs) /
            TAB_SWIPE_BUMP_MS,
        ),
      );
      this.swipeBumpY = swipeBumpOffset(progress);
      if (progress >= 1) {
        this.swipeBumpMotion = null;
        this.swipeBumpY = 0;
      } else {
        active = true;
      }
    }
    this.applyIconLayout();
    this.applyMotionTransform();
    return active;
  }

  applyMotionTransform() {
    this.motionRoot.position.set(
      this.width / 2,
      TAB_HEIGHT + this.swipeBumpY,
    );
    this.motionRoot.scale.set(this.selectedScale);
    this.layoutNotification();
  }

  applyIconLayout() {
    const selected = this.state.selected === true;
    const selectionProgress =
      selected && this.selectedMotion
        ? this.selectedIconProgress
        : selected
          ? 1
          : 0;
    const inactiveCenterY =
      TAB_RISE + TAB_ICON_TOP + TAB_ICON_SIZE / 2;
    const selectedCenterY = TAB_ICON_TOP + TAB_ICON_SIZE / 2;
    this.iconFrame.position.y = interpolate(
      inactiveCenterY,
      selectedCenterY,
      selectionProgress,
    );
    this.iconFrame.scale.set(
      interpolate(
        this.compactIcons
          ? TAB_ICON_COMPACT_INACTIVE_SCALE
          : TAB_ICON_INACTIVE_SCALE,
        this.compactIcons
          ? TAB_ICON_COMPACT_SELECTED_SCALE
          : TAB_ICON_SELECTED_SCALE,
        selectionProgress,
      ),
    );
  }

  updateVisualState() {
    const selected = this.state.selected === true;
    const locked = this.state.unlocked === false;
    this.root.zIndex = selected ? 3 : 1;
    this.frame.setState({
      selected,
      pressed: this.pressed,
      swipeTarget: this.state.swipeTarget === true,
      locked,
    });
    const textOnly = this.definition.textOnly === true;
    this.labelRoot.visible = selected || textOnly;
    this.labelRoot.renderable = this.labelRoot.visible;
    this.labelRoot.alpha = locked ? (textOnly ? 0.68 : 0.34) : 1;
    this.iconFrame.alpha = 1;
    this.applyIconLayout();
    this.iconFrame.visible = !this.receivingUnlock && !locked;
    this.iconFrame.renderable = this.iconFrame.visible;
    this.layoutLabel();
    this.layoutNotification();
  }

  layoutLabel() {
    this.labelRoot.position.y = this.definition.textOnly === true
      ? (this.state.selected === true ? 28 : 34)
      : TAB_ACTIVE_HEIGHT - 2 - this.text.measuredHeight / 2;
  }

  drawNotification(state) {
    const notificationActive =
      state?.notification === true ||
      (
        typeof state?.notification === 'object' &&
        state.notification?.active !== false
      );
    const visible =
      notificationActive &&
      state.unlocked !== false &&
      state.visible === true;
    this.notification.setActive(visible);
    if (!visible) {
      return;
    }
    const tone =
      typeof state.notification === 'object'
        ? state.notification.tone
        : null;
    this.notification.setTone(tone);
    this.layoutNotification();
  }

  layoutNotification() {
    if (!this.notification) {
      return;
    }
    const frameY =
      this.state.selected === true ? 0 : TAB_RISE;
    const scale = this.selectedScale;
    const frameTopRight = {
      x: this.layoutX + this.width / 2 + (this.width / 2) * scale,
      y:
        TAB_HEIGHT +
        this.swipeBumpY +
        (frameY - TAB_HEIGHT) * scale,
    };
    this.notification.placeInsideTopRight({
      x: frameTopRight.x,
      y: frameTopRight.y,
      width: 0,
      height: 0,
    });
  }

  destroy() {
    this.registration?.unregister?.();
    this.semanticRegistry?.unregister?.(this.semanticId, {
      displayObject: this.root,
    });
    this.settleMotion();
    this.notification.destroy();
    this.root.destroy({ children: true });
  }
}

export class PixiBottomHudTextTab extends PixiBottomRoomTab {
  constructor(options = {}) {
    super({
      ...options,
      definition: {
        ...(options.definition ?? {}),
        textOnly: true,
      },
    });
  }

  layoutLabel() {
    const locked = this.state.unlocked === false;
    this.labelRoot.position.y = locked
      ? 49
      : this.state.selected === true
        ? 28
        : 34;
    this.lock.position.y = locked ? 25 : TAB_LOCK_CENTER_Y;
  }
}

class PixiRoomTabFrame extends Container {
  constructor({
    assets,
    width,
    label,
  }) {
    super();
    this.label = label;
    this.assets = assets;
    this.frameWidth = width;
    this.mode = 'inactive';
    this.selected = false;
    this.locked = false;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    const initial = PIXI_ROOM_TAB_FRAME_STATES.inactive;
    this.sprite = new NineSliceSprite({
      texture: assets.getTexture(initial.textureId),
      ...PIXI_ROOM_TAB_FRAME_SLICE,
      label: `${label}:sprite`,
      roundPixels: true,
    });
    this.lockedFilter = createColorFilter({
      grayscale: 0.6,
      brightness: 0.72,
    });
    this.addChild(this.sprite);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
    return this;
  }

  setWidth(width) {
    this.frameWidth = Math.max(0, Number(width) || 0);
    this.redraw();
  }

  setState({
    selected = false,
    pressed = false,
    swipeTarget = false,
    locked = false,
  } = {}) {
    this.selected = selected === true;
    this.locked = locked === true;
    this.mode =
      !this.locked &&
      (this.selected || pressed || swipeTarget)
        ? 'active'
        : 'inactive';
    this.filters =
      this.locked && this.lockedFilter
        ? [this.lockedFilter]
        : null;
    this.redraw();
  }

  redraw() {
    const appearance = {
      textureId:
        this.mode === 'active'
          ? (
              this.theme.chrome?.roomTabActive ??
              PIXI_ROOM_TAB_FRAME_STATES.active.textureId
            )
          : (
              this.theme.chrome?.roomTabInactive ??
              PIXI_ROOM_TAB_FRAME_STATES.inactive.textureId
            ),
    };
    const elevated = this.selected && !this.locked;
    const frameY = elevated ? 0 : TAB_RISE;
    const frameHeight =
      (
        elevated
          ? TAB_ACTIVE_HEIGHT
          : TAB_INACTIVE_HEIGHT
      ) + TAB_BOTTOM_BLEED;

    const texture = this.assets.getTexture(appearance.textureId);
    if (this.sprite.texture !== texture) {
      this.sprite.texture = texture;
    }
    this.sprite.position.set(0, frameY);
    this.sprite.scale.set(PIXI_ROOM_TAB_FRAME_SCALE);
    this.sprite.setSize(
      this.frameWidth / PIXI_ROOM_TAB_FRAME_SCALE,
      frameHeight / PIXI_ROOM_TAB_FRAME_SCALE,
    );
    this.frameY = frameY;
    this.frameHeight = frameHeight;
    this.textureId = appearance.textureId;
  }

  destroy(options) {
    this.filters = null;
    this.lockedFilter?.destroy?.();
    this.lockedFilter = null;
    super.destroy(options);
  }
}

function createTabLabel({
  text,
  color,
  label,
}) {
  return new PixiTextLabel({
    text,
    fontSize: 11,
    lineHeight: 12,
    align: 'center',
    anchor: { x: 0.5, y: 0.5 },
    color,
    wordWrap: true,
    label,
  });
}

function createColorFilter({
  grayscale,
  brightness,
}) {
  try {
    const gray = Math.max(0, Math.min(1, grayscale));
    const light = Math.max(0, brightness);
    const color = 1 - gray;
    const red = 0.2126 * gray;
    const green = 0.7152 * gray;
    const blue = 0.0722 * gray;
    const filter = new ColorMatrixFilter();
    filter.matrix = [
      light * (color + red),
      light * green,
      light * blue,
      0,
      0,
      light * red,
      light * (color + green),
      light * blue,
      0,
      0,
      light * red,
      light * green,
      light * (color + blue),
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ];
    return filter;
  } catch {
    return null;
  }
}

export class FeatureUnlockFlyoutWidget {
  constructor({ parent }) {
    this.root = new Container();
    this.root.label = 'bottomPanel:unlockFlyout';
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.icon = new Sprite({
      texture: Texture.EMPTY,
      label: 'bottomPanel:unlockFlyout:icon',
      roundPixels: true,
    });
    this.icon.anchor.set(0.5);
    this.root.addChild(this.icon);
    parent.addChild(this.root);
    this.data = null;
  }

  bind(data) {
    this.data = data;
    this.icon.texture = data.texture ?? Texture.EMPTY;
    this.icon.width = Math.max(0, Number(data.width) || 0);
    this.icon.height = Math.max(0, Number(data.height) || 0);
    this.root.visible = true;
    this.root.renderable = true;
    this.update(0);
  }

  update(progress) {
    if (!this.data) {
      return;
    }
    const value = Math.min(1, Math.max(0, Number(progress) || 0));
    const inverse = 1 - value;
    const { origin, target } = this.data;
    const control = {
      x: origin.x + (target.x - origin.x) * 0.52,
      y: Math.min(origin.y, target.y) - this.data.arcHeight,
    };
    const centerX =
      inverse * inverse * origin.x +
      2 * inverse * value * control.x +
      value * value * target.x;
    const centerY =
      inverse * inverse * origin.y +
      2 * inverse * value * control.y +
      value * value * target.y;
    const travelScale =
      this.data.sourceScale +
      (1 - this.data.sourceScale) * value ** 0.82;
    this.root.position.set(centerX, centerY);
    this.root.scale.set(
      this.data.targetScale * travelScale,
    );
    this.root.alpha =
      value >= 0.1
        ? 1
        : 0.92 + 0.08 * (value / 0.1);
  }

  reset() {
    this.data = null;
    this.icon.texture = Texture.EMPTY;
    this.root.visible = false;
    this.root.renderable = false;
    this.root.alpha = 1;
    this.root.scale.set(1);
    this.root.position.set(0, 0);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

function selectedMotionScale(progress) {
  if (progress <= TAB_SELECTED_PEAK_AT) {
    return interpolate(
      1,
      TAB_SELECTED_PEAK_SCALE,
      easeSoft(progress / TAB_SELECTED_PEAK_AT),
    );
  }
  return interpolate(
    TAB_SELECTED_PEAK_SCALE,
    1,
    easeSoft(
      (progress - TAB_SELECTED_PEAK_AT) /
        (1 - TAB_SELECTED_PEAK_AT),
    ),
  );
}

function swipeBumpOffset(progress) {
  if (progress <= TAB_SWIPE_BUMP_PEAK_AT) {
    return interpolate(
      0,
      TAB_SWIPE_BUMP_Y,
      easeSoft(progress / TAB_SWIPE_BUMP_PEAK_AT),
    );
  }
  return interpolate(
    TAB_SWIPE_BUMP_Y,
    0,
    easeSoft(
      (progress - TAB_SWIPE_BUMP_PEAK_AT) /
        (1 - TAB_SWIPE_BUMP_PEAK_AT),
    ),
  );
}

function easeSoft(progress) {
  return cubicBezier(progress, 0.39, 0.575, 0.565, 1);
}

function easeOutQuart(progress) {
  return 1 - (1 - progress) ** 4;
}

function cubicBezier(progress, x1, y1, x2, y2) {
  const target = Math.min(1, Math.max(0, progress));
  let low = 0;
  let high = 1;
  let time = target;
  for (let index = 0; index < 10; index += 1) {
    const x = cubicPoint(time, x1, x2);
    if (Math.abs(x - target) < 0.00001) {
      break;
    }
    if (x < target) {
      low = time;
    } else {
      high = time;
    }
    time = (low + high) / 2;
  }
  return cubicPoint(time, y1, y2);
}

function cubicPoint(time, first, second) {
  const inverse = 1 - time;
  return (
    3 * inverse * inverse * time * first +
    3 * inverse * time * time * second +
    time * time * time
  );
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function projectStageBoundsToSource(bounds, projection) {
  if (
    !bounds ||
    ![
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    ].every(Number.isFinite)
  ) {
    return null;
  }
  const sourceScale = Math.max(
    0.0001,
    Number(projection?.sourceScale) || 1,
  );
  return {
    x:
      (
        Number(bounds.x) -
        (Number(projection?.authoredOffsetX) || 0)
      ) / sourceScale,
    y: Number(bounds.y) / sourceScale,
    width: Math.max(0, Number(bounds.width)) / sourceScale,
    height: Math.max(0, Number(bounds.height)) / sourceScale,
  };
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(
    () => callback(defaultTimeSource()),
    16,
  ) ?? 0;
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}

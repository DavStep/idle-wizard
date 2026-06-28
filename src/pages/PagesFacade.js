import { BrewingPageFacade } from './brewing/BrewingPageFacade.js';
import { AllianceInfoDialogFacade } from './allianceInfo/AllianceInfoDialogFacade.js';
import { PageAnnouncementFacade } from './announcements/PageAnnouncementFacade.js';
import { GardenPageFacade } from './garden/GardenPageFacade.js';
import { GuildPageFacade } from './guild/GuildPageFacade.js';
import { ShopPageFacade } from './shop/ShopPageFacade.js';
import { ResearchPageFacade } from './research/ResearchPageFacade.js';
import { PrestigePageFacade } from './prestige/PrestigePageFacade.js';
import { BottomPanelFacade } from './bottomPanel/BottomPanelFacade.js';
import { PageNotificationFacade } from './notifications/PageNotificationFacade.js';
import { PlayerInfoDialogFacade } from './playerInfo/PlayerInfoDialogFacade.js';
import { TopPanelFacade } from './topPanel/TopPanelFacade.js';
import { TutorialFacade } from './tutorial/TutorialFacade.js';
import { WorkshopPageFacade } from './workshop/WorkshopPageFacade.js';
import { WorkshopBagManager } from './workshop/managers/WorkshopBagManager.js';
import { WorkshopWorldChatManager } from './workshop/managers/WorkshopWorldChatManager.js';
import { CurrentPageManager } from './managers/CurrentPageManager.js';
import { PageUnlockManager } from './managers/PageUnlockManager.js';
import { PageRegistryManager } from './managers/PageRegistryManager.js';
import { setNotificationVisibilityPolicy } from './shared/notificationBadge.js';
import {
  DEFAULT_PAGE_SWIPE_ORDER,
  PageSwipeNavigationManager,
} from './managers/PageSwipeNavigationManager.js';
import { PressFeedbackManager } from './managers/PressFeedbackManager.js';
import { ScrollCueManager } from './managers/ScrollCueManager.js';

const FTUE_ENABLED = true;
const SWIPE_PAGE_IDS = ['brewing', 'garden', 'workshop', 'research', 'shop', 'prestige'];

export class PagesFacade {
  static explain =
    'Chooses which room the player is looking at and asks that room to show itself.';

  constructor({
    gameplayFacade,
    playerFacade,
    leaderboardFacade,
    worldEventLeaderboardFacade,
    worldChatFacade,
    tradeAllianceFacade,
    feedbackFacade,
    playerInboxFacade,
    playerInfoFacade,
    playerShopFacade,
    npcMarketFacade,
    authFacade,
    hapticsFacade,
    soundSettingsFacade,
    uiClickSoundFacade,
    pixiProgressOverlayManager = null,
    tutorialStorage,
    defaultPageId = 'workshop',
  } = {}) {
    this.stage = null;
    this.gameplayFacade = gameplayFacade;
    this.npcMarketFacade = npcMarketFacade;
    this.releaseNpcMarketPrices = null;
    this.npcMarketPricesRetained = false;
    this.registryManager = new PageRegistryManager();
    this.pageUnlockManager = new PageUnlockManager({
      pageOrder: DEFAULT_PAGE_SWIPE_ORDER,
    });
    this.pageStates = this.pageUnlockManager.getPageStates();
    this.unlockedPageIds = this.pageStates
      .filter((page) => page.unlocked)
      .map((page) => page.id);
    this.pageUnlockUnsubscribe = null;
    this.currentPageManager = new CurrentPageManager({
      pageRegistryManager: this.registryManager,
      defaultPageId,
    });
    this.researchTabId = 'regular';
    this.swipeNavigationManager = new PageSwipeNavigationManager({
      pageOrder: DEFAULT_PAGE_SWIPE_ORDER,
      getCurrentPageId: () => this.getCurrentPageId(),
      onShowPage: (pageId) => this.showFromSwipe(pageId),
      onSwipeTargetChange: (pageId) => this.bottomPanelFacade.setSwipeTargetPageId(pageId),
    });
    this.pressFeedbackManager = new PressFeedbackManager({
      hapticsFacade,
      uiClickSoundFacade,
    });
    this.scrollCueManager = new ScrollCueManager();
    this.inventoryPopupLayer = null;
    this.inventoryDialogManager = new WorkshopBagManager({ gameplayFacade });
    this.bottomPanelFacade = new BottomPanelFacade({
      getCurrentPageId: () => this.getCurrentPageId(),
      onShowPage: (pageId) => this.show(pageId),
    });
    this.notificationFacade = new PageNotificationFacade({
      gameplayFacade,
      playerShopFacade,
      tradeAllianceFacade,
      onChange: (snapshot) => this.bottomPanelFacade.setNotifications(snapshot.pages),
    });
    this.announcementFacade = new PageAnnouncementFacade({ gameplayFacade });
    this.topPanelFacade = new TopPanelFacade({
      gameplayFacade,
      playerFacade,
      authFacade,
      feedbackFacade,
      playerInboxFacade,
      hapticsFacade,
      soundSettingsFacade,
    });
    this.playerInfoDialogFacade = new PlayerInfoDialogFacade({
      playerInfoFacade,
      onOpenAllianceInfo: (alliance) => this.allianceInfoDialogFacade.show(alliance),
    });
    this.allianceInfoDialogFacade = new AllianceInfoDialogFacade({
      tradeAllianceFacade,
      onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
    });
    this.worldChatManager = new WorkshopWorldChatManager({
      gameplayFacade,
      playerFacade,
      worldChatFacade,
      tradeAllianceFacade,
      onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
    });
    this.tutorialFacade = FTUE_ENABLED
      ? new TutorialFacade({
          gameplayFacade,
          getCurrentPageId: () => this.getCurrentPageId(),
          onShowPage: (pageId) => this.show(pageId),
          storage: tutorialStorage,
          onNotificationVisibilityPolicyChange: (policy) =>
            this.applyTutorialNotificationVisibilityPolicy(policy),
        })
      : null;

    this.registryManager.register(
      'workshop',
      new WorkshopPageFacade({
        gameplayFacade,
        playerFacade,
        hapticsFacade,
        leaderboardFacade,
        worldEventLeaderboardFacade,
        tradeAllianceFacade,
        onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
        onOpenAllianceInfo: (alliance) => this.allianceInfoDialogFacade.show(alliance),
        onOpenBag: () => this.toggleInventoryDialog(),
      }),
    );
    this.registryManager.register(
      'brewing',
      new BrewingPageFacade({
        gameplayFacade,
        onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
      }),
    );
    this.registryManager.register(
      'garden',
      new GardenPageFacade({
        gameplayFacade,
        pixiProgressOverlayManager,
      }),
    );
    this.registryManager.register(
      'research',
      new ResearchPageFacade({
        gameplayFacade,
        onSelectedTabChange: (tabId) => this.setResearchTabId(tabId),
      }),
    );
    this.registryManager.register(
      'guild',
      new GuildPageFacade({
        gameplayFacade,
      }),
    );
    this.registryManager.register(
      'shop',
      new ShopPageFacade({
        gameplayFacade,
        playerShopFacade,
        onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
        onDirectSellOverride: (sale) =>
          this.tutorialFacade?.handleDirectSellOverride?.(sale) ?? null,
        getDirectSellQuoteOverride: (sale) =>
          this.tutorialFacade?.getDirectSellQuoteOverride?.(sale) ?? null,
        getNpcSellPriceOverride: (sale) =>
          this.tutorialFacade?.getNpcSellPriceOverride?.(sale) ?? null,
        getNpcStockBuyQuoteOverride: (sale) =>
          this.tutorialFacade?.getNpcStockBuyQuoteOverride?.(sale) ?? null,
      }),
    );
    this.registryManager.register(
      'prestige',
      new PrestigePageFacade({
        gameplayFacade,
      }),
    );
  }

  mount(stage) {
    this.withGameplaySnapshotCache(() => {
      this.stage = stage;
      this.pressFeedbackManager.mount(stage);
      this.currentPageManager.mount(stage);
      this.swipeNavigationManager.mount(stage);
      this.bottomPanelFacade.mount(stage);
      this.notificationFacade.mount();
      this.announcementFacade.mount(stage);
      this.worldChatManager.mount(stage);
      this.mountInventoryDialog(stage);
      this.topPanelFacade.mount(stage);
      this.playerInfoDialogFacade.mount(stage);
      this.allianceInfoDialogFacade.mount(stage);
      this.syncTopPanelResourceContext();
      this.syncPageUnlocks(this.getGameplaySnapshot());
      this.pageUnlockUnsubscribe =
        this.gameplayFacade?.subscribe?.((snapshot) => this.syncPageUnlocks(snapshot)) ?? null;
      this.tutorialFacade?.mount(stage);
      this.scrollCueManager.mount(stage);
    });
  }

  unmount() {
    this.applyTutorialNotificationVisibilityPolicy(null);
    this.scrollCueManager.unmount();
    this.tutorialFacade?.unmount();
    this.pageUnlockUnsubscribe?.();
    this.pageUnlockUnsubscribe = null;
    this.releaseNpcMarketPrices?.();
    this.releaseNpcMarketPrices = null;
    this.npcMarketPricesRetained = false;
    this.topPanelFacade.unmount();
    this.unmountInventoryDialog();
    this.allianceInfoDialogFacade.unmount();
    this.playerInfoDialogFacade.unmount();
    this.worldChatManager.unmount();
    this.announcementFacade.unmount();
    this.notificationFacade.unmount();
    this.bottomPanelFacade.unmount();
    this.swipeNavigationManager.unmount();
    this.currentPageManager.unmount();
    this.pressFeedbackManager.unmount();
    this.stage = null;
  }

  show(pageId) {
    this.withGameplaySnapshotCache(() => {
      this.currentPageManager.show(this.getUnlockedPageId(pageId));
      this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
      this.syncTopPanelResourceContext();
      this.syncNpcMarketPriceSubscription();
    });
    this.tutorialFacade?.scheduleRefresh();
  }

  showFromSwipe(pageId) {
    if (this.unlockedPageIds.includes(pageId)) {
      this.show(pageId);
      return;
    }

    this.bottomPanelFacade.showLockedPage(pageId);
  }

  resetTutorialProgress() {
    this.tutorialFacade?.resetProgress();
  }

  listTutorialStages() {
    return (
      this.tutorialFacade?.listStages?.() ?? {
        ok: false,
        reason: 'tutorial_missing',
      }
    );
  }

  setTutorialStage(stageId) {
    return (
      this.tutorialFacade?.setStage?.(stageId) ?? {
        ok: false,
        reason: 'tutorial_missing',
      }
    );
  }

  setDevNotifications(snapshot) {
    const result =
      typeof this.notificationFacade?.setDevSnapshot === 'function'
        ? this.notificationFacade.setDevSnapshot(snapshot)
        : { ok: false, reason: 'notifications_missing' };

    if (result.ok !== false) {
      this.bottomPanelFacade.setNotifications(result.snapshot.pages);
    }

    return result;
  }

  clearDevNotifications() {
    const result =
      typeof this.notificationFacade?.clearDevSnapshot === 'function'
        ? this.notificationFacade.clearDevSnapshot()
        : { ok: false, reason: 'notifications_missing' };

    if (result.ok !== false) {
      this.bottomPanelFacade.setNotifications(result.snapshot.pages);
    }

    return result;
  }

  openDialog(dialogId, options = {}) {
    const normalizedDialogId = this.normalizeDevDialogId(dialogId);

    if (!normalizedDialogId) {
      return { ok: false, reason: 'invalid_dialog_id', dialogId };
    }

    if (!this.currentPageManager.stage) {
      return { ok: false, reason: 'pages_not_mounted' };
    }

    switch (normalizedDialogId) {
      case 'bag':
      case 'inventory':
        return this.openInventoryDialog(options);
      case 'seeds':
        return this.openInventoryDialog({ ...options, tab: options.tab ?? 'seeds' });
      case 'herbs':
        return this.openInventoryDialog({ ...options, tab: options.tab ?? 'herbs' });
      case 'potions':
        return this.openInventoryDialog({ ...options, tab: options.tab ?? 'potions' });
      case 'summoninfo':
      case 'summon':
        return this.openWorkshopDialog('summonInfo', options);
      case 'leaderboard':
      case 'leaderboards':
        return this.openWorkshopDialog('leaderboard', options);
      case 'alliance':
      case 'alliances':
        return this.openWorkshopDialog('tradeAlliance', options);
      case 'discoveries':
      case 'discovery':
        return this.openWorkshopDialog('discoveries', options);
      case 'personaltasks':
      case 'tasks':
        return this.openWorkshopDialog('personalTasks', options);
      case 'worldevent':
      case 'event':
      case 'worldnotice':
        return this.openWorkshopDialog('worldNotice', options);
      case 'chat':
      case 'worldchat':
        return this.openWorkshopDialog('worldChat', options);
      case 'market':
      case 'shop':
        return this.openShopDialog(options);
      case 'guild':
      case 'guildcharter':
      case 'guildsettings':
      case 'guildrequest':
      case 'guildadventurer':
        return this.openGuildDialog(normalizedDialogId, options);
      case 'settings':
      case 'configurations':
        return this.openTopPanelDialog('settings', options);
      case 'feedback':
      case 'bug':
      case 'feature':
        return this.openTopPanelDialog(normalizedDialogId, options);
      case 'level':
      case 'levels':
        return this.openTopPanelDialog('level', options);
      case 'mail':
      case 'inbox':
        return this.openTopPanelDialog('inbox', options);
      default:
        return { ok: false, reason: 'unknown_dialog', dialogId };
    }
  }

  getCurrentPageId() {
    return this.currentPageManager.getCurrentPageId();
  }

  setResearchTabId(tabId) {
    this.researchTabId = typeof tabId === 'string' ? tabId : 'regular';
    this.syncTopPanelResourceContext();
  }

  syncPageUnlocks(snapshot = {}) {
    this.pageStates = this.pageUnlockManager.getPageStates(snapshot);
    this.unlockedPageIds = this.pageStates
      .filter((page) => page.unlocked)
      .map((page) => page.id);
    this.bottomPanelFacade.setPageStates(this.pageStates);
    this.bottomPanelFacade.setActionStates([]);
    this.swipeNavigationManager.setPageOrder(
      this.pageStates
        .filter((page) => page.visible !== false)
        .map((page) => page.id)
        .filter((pageId) => SWIPE_PAGE_IDS.includes(pageId)),
    );

    if (this.unlockedPageIds.includes(this.getCurrentPageId())) {
      this.syncNpcMarketPriceSubscription();
      return;
    }

    this.withGameplaySnapshotCache(() => {
      this.currentPageManager.show(this.getFallbackPageId());
      this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
      this.syncTopPanelResourceContext();
    });
    this.syncNpcMarketPriceSubscription();
    this.tutorialFacade?.scheduleRefresh();
  }

  syncNpcMarketPriceSubscription() {
    const shouldRetain =
      this.getCurrentPageId() === 'shop' && this.unlockedPageIds.includes('shop');

    if (shouldRetain) {
      if (!this.npcMarketPricesRetained) {
        const release =
          this.npcMarketFacade?.retainPrices?.() ??
          this.npcMarketFacade?.retainPublicData?.() ??
          null;
        this.releaseNpcMarketPrices = typeof release === 'function' ? release : null;
        this.npcMarketPricesRetained = true;
      }

      return;
    }

    if (!this.npcMarketPricesRetained) {
      return;
    }

    this.releaseNpcMarketPrices?.();
    this.releaseNpcMarketPrices = null;
    this.npcMarketPricesRetained = false;
  }

  getUnlockedPageId(pageId) {
    if (this.unlockedPageIds.includes(pageId)) {
      return pageId;
    }

    return this.getFallbackPageId();
  }

  getFallbackPageId() {
    return this.unlockedPageIds.includes('workshop') ? 'workshop' : (this.unlockedPageIds[0] ?? 'workshop');
  }

  getGameplaySnapshot() {
    return this.gameplayFacade?.getSnapshot?.() ?? {};
  }

  withGameplaySnapshotCache(callback) {
    if (typeof this.gameplayFacade?.withSnapshotCache !== 'function') {
      return callback();
    }

    return this.gameplayFacade.withSnapshotCache(callback);
  }

  syncTopPanelResourceContext() {
    this.topPanelFacade.setResourceContext(this.getTopPanelResourceContext());
  }

  applyTutorialNotificationVisibilityPolicy(policy) {
    setNotificationVisibilityPolicy(policy, { root: this.stage });
    this.notificationFacade.publish();
  }

  mountInventoryDialog(stage) {
    if (this.inventoryPopupLayer || !stage) {
      return;
    }

    this.inventoryPopupLayer = document.createElement('div');
    this.inventoryPopupLayer.className =
      'room-page__popup-layer room-inventory-popup-layer';
    stage.append(this.inventoryPopupLayer);
    this.inventoryDialogManager.mount(this.inventoryPopupLayer);
  }

  unmountInventoryDialog() {
    this.inventoryDialogManager.unmount();
    this.inventoryPopupLayer?.remove();
    this.inventoryPopupLayer = null;
  }

  openInventoryDialog(options = {}) {
    const tabId = this.normalizeDevDialogTab(options.tab ?? options.type);

    if (tabId) {
      this.inventoryDialogManager.selectedTabId = tabId;
      this.inventoryDialogManager.renderedSignature = '';
    }

    this.inventoryDialogManager.render(this.getGameplaySnapshot());
    this.inventoryDialogManager.show();
    return {
      ok: true,
      dialogId: 'bag',
      tabId: tabId ?? this.inventoryDialogManager.selectedTabId,
    };
  }

  toggleInventoryDialog() {
    this.inventoryDialogManager.toggle();
    return { ok: true, dialogId: 'bag' };
  }

  openWorkshopDialog(managerId, options = {}) {
    if (managerId === 'bag') {
      return this.openInventoryDialog(options);
    }

    this.show('workshop');
    const page = this.registryManager.get('workshop');

    if (managerId === 'summonInfo') {
      page.summonInfoManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    if (managerId === 'leaderboard') {
      page.leaderboardManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    if (managerId === 'tradeAlliance') {
      page.tradeAllianceManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    if (managerId === 'discoveries') {
      const tabId = this.normalizeDevDialogTab(options.tab);
      if (tabId && page.discoveriesManager) {
        page.discoveriesManager.selectedTabId = tabId;
      }
      page.discoveriesManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    if (managerId === 'personalTasks') {
      page.personalTasksManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    if (managerId === 'worldNotice') {
      const tabId = this.normalizeDevDialogTab(options.tab ?? options.view);
      if (tabId) {
        page.worldNoticeManager?.onSelectTab?.(tabId);
      }
      page.worldNoticeManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop', tabId };
    }

    if (managerId === 'worldChat') {
      this.worldChatManager?.show?.();
      return { ok: true, dialogId: managerId, pageId: 'workshop' };
    }

    return { ok: false, reason: 'unknown_workshop_dialog', dialogId: managerId };
  }

  openShopDialog(options = {}) {
    this.show('shop');
    const page = this.registryManager.get('shop');
    const tabId = this.normalizeShopTabId(options.tab ?? options.view);
    page.marketTabsManager?.setActiveTab?.(tabId);

    if (options.popup === 'listing') {
      page.playerShelfManager?.showListingPopup?.();
    } else if (options.popup === 'request') {
      page.playerRequestManager?.showPopup?.();
    } else if (options.popup === 'history') {
      page.tradeHistoryManager?.show?.();
    } else if (options.popup === 'sell') {
      page.shelfManager?.showSellPopup?.();
    } else if (options.popup === 'directSell') {
      page.directSellManager?.show?.();
    }

    return { ok: true, dialogId: 'market', pageId: 'shop', tabId };
  }

  openGuildDialog(dialogId, options = {}) {
    this.show('guild');
    const page = this.registryManager.get('guild');
    const manager = page.panelManager;

    if (dialogId === 'guildcharter') {
      manager?.showCharterDialog?.();
      return { ok: true, dialogId, pageId: 'guild' };
    }

    if (dialogId === 'guildsettings') {
      manager?.showSettingsDialog?.();
      return { ok: true, dialogId, pageId: 'guild' };
    }

    const snapshot = this.getGameplaySnapshot().guild ?? {};

    if (dialogId === 'guildrequest') {
      const requestId =
        options.requestId ??
        snapshot.board?.[0]?.id ??
        snapshot.availableRequests?.[0]?.id ??
        null;
      manager?.showRequestDialog?.(requestId);
      return { ok: true, dialogId, pageId: 'guild', requestId };
    }

    if (dialogId === 'guildadventurer') {
      const adventurer =
        snapshot.adventurers?.[0] ??
        snapshot.applicants?.[0] ??
        null;
      const adventurerId = options.adventurerId ?? adventurer?.id ?? null;
      const kind = options.kind ?? (snapshot.adventurers?.[0] ? 'adventurer' : 'applicant');
      manager?.showAdventurerDialog?.(adventurerId, kind);
      return { ok: true, dialogId, pageId: 'guild', adventurerId, kind };
    }

    manager?.showPopup?.();
    return { ok: true, dialogId, pageId: 'guild' };
  }

  openTopPanelDialog(dialogId, options = {}) {
    if (dialogId === 'level') {
      this.topPanelFacade.levelManager?.show?.();
      return { ok: true, dialogId: 'level' };
    }

    if (dialogId === 'inbox') {
      this.topPanelFacade.inboxManager?.show?.();
      return { ok: true, dialogId: 'inbox' };
    }

    if (dialogId === 'feedback' || dialogId === 'bug' || dialogId === 'feature') {
      this.topPanelFacade.settingsManager?.showFeedback?.(dialogId);
      return { ok: true, dialogId };
    }

    this.topPanelFacade.settingsManager?.showSettings?.();
    const tabId = this.normalizeDevDialogTab(options.tab);
    if (tabId) {
      this.topPanelFacade.settingsManager?.selectSettingsTab?.(tabId);
    }
    return { ok: true, dialogId: 'settings', tabId };
  }

  normalizeDevDialogId(dialogId) {
    return String(dialogId ?? '')
      .trim()
      .replace(/[_\s-]/g, '')
      .toLowerCase();
  }

  normalizeDevDialogTab(tabId) {
    const trimmed = String(tabId ?? '').trim();
    return trimmed || null;
  }

  normalizeShopTabId(tabId) {
    const normalized = this.normalizeDevDialogId(tabId);

    if (normalized === 'player' || normalized === 'playermarket') {
      return 'player';
    }

    if (normalized === 'crystal' || normalized === 'crystals') {
      return 'crystals';
    }

    return 'npm';
  }

  getTopPanelResourceContext() {
    if (this.getCurrentPageId() !== 'research') {
      return {};
    }

    if (this.researchTabId === 'automation') {
      return { currency: 'crystal' };
    }

    if (this.researchTabId === 'advanced') {
      return { currency: 'ruby' };
    }

    if (this.researchTabId === 'emerald') {
      return { currency: 'emerald' };
    }

    return {};
  }
}

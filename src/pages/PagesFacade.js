import { BrewingPageFacade } from './brewing/BrewingPageFacade.js';
import { AllianceInfoDialogFacade } from './allianceInfo/AllianceInfoDialogFacade.js';
import { GardenPageFacade } from './garden/GardenPageFacade.js';
import { ShopPageFacade } from './shop/ShopPageFacade.js';
import { ResearchPageFacade } from './research/ResearchPageFacade.js';
import { BottomPanelFacade } from './bottomPanel/BottomPanelFacade.js';
import { PageNotificationFacade } from './notifications/PageNotificationFacade.js';
import { PlayerInfoDialogFacade } from './playerInfo/PlayerInfoDialogFacade.js';
import { TopPanelFacade } from './topPanel/TopPanelFacade.js';
import { TutorialFacade } from './tutorial/TutorialFacade.js';
import { WorkshopPageFacade } from './workshop/WorkshopPageFacade.js';
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

export class PagesFacade {
  static explain =
    'Chooses which room the player is looking at and asks that room to show itself.';

  constructor({
    gameplayFacade,
    playerFacade,
    leaderboardFacade,
    worldChatFacade,
    tradeAllianceFacade,
    feedbackFacade,
    playerInfoFacade,
    playerShopFacade,
    authFacade,
    hapticsFacade,
    soundSettingsFacade,
    uiClickSoundFacade,
    tutorialStorage,
    defaultPageId = 'workshop',
  } = {}) {
    this.stage = null;
    this.gameplayFacade = gameplayFacade;
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
    this.bottomPanelFacade = new BottomPanelFacade({
      getCurrentPageId: () => this.getCurrentPageId(),
      onShowPage: (pageId) => this.show(pageId),
    });
    this.notificationFacade = new PageNotificationFacade({
      gameplayFacade,
      playerShopFacade,
      onChange: (snapshot) => this.bottomPanelFacade.setNotifications(snapshot.pages),
    });
    this.topPanelFacade = new TopPanelFacade({
      gameplayFacade,
      playerFacade,
      authFacade,
      feedbackFacade,
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
      worldChatFacade,
      tradeAllianceFacade,
      onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
    });
    this.tutorialFacade = FTUE_ENABLED
      ? new TutorialFacade({
          gameplayFacade,
          getCurrentPageId: () => this.getCurrentPageId(),
          storage: tutorialStorage,
          onNotificationVisibilityPolicyChange: (policy) =>
            this.applyTutorialNotificationVisibilityPolicy(policy),
        })
      : null;

    this.registryManager.register(
      'workshop',
      new WorkshopPageFacade({
        gameplayFacade,
        leaderboardFacade,
        tradeAllianceFacade,
        onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
        onOpenAllianceInfo: (alliance) => this.allianceInfoDialogFacade.show(alliance),
      }),
    );
    this.registryManager.register(
      'brewing',
      new BrewingPageFacade({
        gameplayFacade,
      }),
    );
    this.registryManager.register(
      'garden',
      new GardenPageFacade({
        gameplayFacade,
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
  }

  mount(stage) {
    this.withGameplaySnapshotCache(() => {
      this.stage = stage;
      this.pressFeedbackManager.mount(stage);
      this.currentPageManager.mount(stage);
      this.swipeNavigationManager.mount(stage);
      this.bottomPanelFacade.mount(stage);
      this.notificationFacade.mount();
      this.worldChatManager.mount(stage);
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
    this.topPanelFacade.unmount();
    this.allianceInfoDialogFacade.unmount();
    this.playerInfoDialogFacade.unmount();
    this.worldChatManager.unmount();
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
    this.swipeNavigationManager.setPageOrder(this.pageStates.map((page) => page.id));

    if (this.unlockedPageIds.includes(this.getCurrentPageId())) {
      return;
    }

    this.withGameplaySnapshotCache(() => {
      this.currentPageManager.show(this.getFallbackPageId());
      this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
      this.syncTopPanelResourceContext();
    });
    this.tutorialFacade?.scheduleRefresh();
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

    return {};
  }
}

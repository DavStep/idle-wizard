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
import {
  DEFAULT_PAGE_SWIPE_ORDER,
  PageSwipeNavigationManager,
} from './managers/PageSwipeNavigationManager.js';
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
    tutorialStorage,
    defaultPageId = 'workshop',
  } = {}) {
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
      onShowPage: (pageId) => this.show(pageId),
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
      worldChatFacade,
      tradeAllianceFacade,
      onOpenPlayerInfo: (player) => this.playerInfoDialogFacade.show(player),
    });
    this.tutorialFacade = FTUE_ENABLED
      ? new TutorialFacade({
          gameplayFacade,
          getCurrentPageId: () => this.getCurrentPageId(),
          storage: tutorialStorage,
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
  }

  unmount() {
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
  }

  show(pageId) {
    this.currentPageManager.show(this.getUnlockedPageId(pageId));
    this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
    this.syncTopPanelResourceContext();
    this.tutorialFacade?.scheduleRefresh();
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
    this.swipeNavigationManager.setPageOrder(this.unlockedPageIds);

    if (this.unlockedPageIds.includes(this.getCurrentPageId())) {
      return;
    }

    this.currentPageManager.show(this.getFallbackPageId());
    this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
    this.syncTopPanelResourceContext();
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

  syncTopPanelResourceContext() {
    this.topPanelFacade.setResourceContext(this.getTopPanelResourceContext());
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

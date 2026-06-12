import { BrewingPageFacade } from './brewing/BrewingPageFacade.js';
import { GardenPageFacade } from './garden/GardenPageFacade.js';
import { ShopPageFacade } from './shop/ShopPageFacade.js';
import { ResearchPageFacade } from './research/ResearchPageFacade.js';
import { BottomPanelFacade } from './bottomPanel/BottomPanelFacade.js';
import { PageNotificationFacade } from './notifications/PageNotificationFacade.js';
import { TopPanelFacade } from './topPanel/TopPanelFacade.js';
import { TutorialFacade } from './tutorial/TutorialFacade.js';
import { WorkshopPageFacade } from './workshop/WorkshopPageFacade.js';
import { WorkshopWorldChatManager } from './workshop/managers/WorkshopWorldChatManager.js';
import { CurrentPageManager } from './managers/CurrentPageManager.js';
import { PageRegistryManager } from './managers/PageRegistryManager.js';
import {
  DEFAULT_PAGE_SWIPE_ORDER,
  PageSwipeNavigationManager,
} from './managers/PageSwipeNavigationManager.js';
import { ScrollCueManager } from './managers/ScrollCueManager.js';

const FTUE_ENABLED = false;

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
    playerShopFacade,
    authFacade,
    defaultPageId = 'workshop',
  } = {}) {
    this.registryManager = new PageRegistryManager();
    this.currentPageManager = new CurrentPageManager({
      pageRegistryManager: this.registryManager,
      defaultPageId,
    });
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
    this.worldChatManager = new WorkshopWorldChatManager({
      worldChatFacade,
      tradeAllianceFacade,
    });
    this.tutorialFacade = FTUE_ENABLED
      ? new TutorialFacade({
          gameplayFacade,
          getCurrentPageId: () => this.getCurrentPageId(),
        })
      : null;

    this.registryManager.register(
      'workshop',
      new WorkshopPageFacade({
        gameplayFacade,
        leaderboardFacade,
        tradeAllianceFacade,
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
      }),
    );
    this.registryManager.register(
      'shop',
      new ShopPageFacade({
        gameplayFacade,
        playerShopFacade,
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
    this.tutorialFacade?.mount(stage);
    this.scrollCueManager.mount(stage);
  }

  unmount() {
    this.scrollCueManager.unmount();
    this.tutorialFacade?.unmount();
    this.topPanelFacade.unmount();
    this.worldChatManager.unmount();
    this.notificationFacade.unmount();
    this.bottomPanelFacade.unmount();
    this.swipeNavigationManager.unmount();
    this.currentPageManager.unmount();
  }

  show(pageId) {
    this.currentPageManager.show(pageId);
    this.bottomPanelFacade.setCurrentPageId(this.getCurrentPageId());
    this.tutorialFacade?.scheduleRefresh();
  }

  getCurrentPageId() {
    return this.currentPageManager.getCurrentPageId();
  }
}

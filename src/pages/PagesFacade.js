import { BrewingPageFacade } from './brewing/BrewingPageFacade.js';
import { GardenPageFacade } from './garden/GardenPageFacade.js';
import { ShopPageFacade } from './shop/ShopPageFacade.js';
import { ResearchPageFacade } from './research/ResearchPageFacade.js';
import { TopPanelFacade } from './topPanel/TopPanelFacade.js';
import { WorkshopPageFacade } from './workshop/WorkshopPageFacade.js';
import { CurrentPageManager } from './managers/CurrentPageManager.js';
import { PageRegistryManager } from './managers/PageRegistryManager.js';
import {
  DEFAULT_PAGE_SWIPE_ORDER,
  PageSwipeNavigationManager,
} from './managers/PageSwipeNavigationManager.js';

export class PagesFacade {
  static explain =
    'Chooses which room the player is looking at and asks that room to show itself.';

  constructor({
    gameplayFacade,
    playerFacade,
    leaderboardFacade,
    worldChatFacade,
    playerShopFacade,
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
    this.topPanelFacade = new TopPanelFacade({
      gameplayFacade,
      playerFacade,
    });

    this.registryManager.register(
      'workshop',
      new WorkshopPageFacade({
        gameplayFacade,
        leaderboardFacade,
        worldChatFacade,
        onShowGarden: () => this.show('garden'),
        onShowResearch: () => this.show('research'),
      }),
    );
    this.registryManager.register(
      'brewing',
      new BrewingPageFacade({
        gameplayFacade,
        onShowGarden: () => this.show('garden'),
      }),
    );
    this.registryManager.register(
      'garden',
      new GardenPageFacade({
        gameplayFacade,
        onShowBrewing: () => this.show('brewing'),
        onShowWorkshop: () => this.show('workshop'),
      }),
    );
    this.registryManager.register(
      'research',
      new ResearchPageFacade({
        gameplayFacade,
        onShowWorkshop: () => this.show('workshop'),
        onShowShop: () => this.show('shop'),
      }),
    );
    this.registryManager.register(
      'shop',
      new ShopPageFacade({
        gameplayFacade,
        playerShopFacade,
        onShowResearch: () => this.show('research'),
      }),
    );
  }

  mount(stage) {
    this.currentPageManager.mount(stage);
    this.swipeNavigationManager.mount(stage);
    this.topPanelFacade.mount(stage);
  }

  unmount() {
    this.topPanelFacade.unmount();
    this.swipeNavigationManager.unmount();
    this.currentPageManager.unmount();
  }

  show(pageId) {
    this.currentPageManager.show(pageId);
  }

  getCurrentPageId() {
    return this.currentPageManager.getCurrentPageId();
  }
}

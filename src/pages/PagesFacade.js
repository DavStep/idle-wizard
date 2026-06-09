import { ShopPageFacade } from './shop/ShopPageFacade.js';
import { ResearchPageFacade } from './research/ResearchPageFacade.js';
import { TopPanelFacade } from './topPanel/TopPanelFacade.js';
import { WorkshopPageFacade } from './workshop/WorkshopPageFacade.js';
import { CurrentPageManager } from './managers/CurrentPageManager.js';
import { PageRegistryManager } from './managers/PageRegistryManager.js';

export class PagesFacade {
  static explain =
    'Chooses which room the player is looking at and asks that room to show itself.';

  constructor({ gameplayFacade, playerFacade, leaderboardFacade, defaultPageId = 'workshop' } = {}) {
    this.registryManager = new PageRegistryManager();
    this.currentPageManager = new CurrentPageManager({
      pageRegistryManager: this.registryManager,
      defaultPageId,
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
        onShowResearch: () => this.show('research'),
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
        onShowResearch: () => this.show('research'),
      }),
    );
  }

  mount(stage) {
    this.currentPageManager.mount(stage);
    this.topPanelFacade.mount(stage);
  }

  unmount() {
    this.topPanelFacade.unmount();
    this.currentPageManager.unmount();
  }

  show(pageId) {
    this.currentPageManager.show(pageId);
  }

  getCurrentPageId() {
    return this.currentPageManager.getCurrentPageId();
  }
}

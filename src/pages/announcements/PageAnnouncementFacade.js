import { PageAnnouncementManager } from './managers/PageAnnouncementManager.js';

export class PageAnnouncementFacade {
  static explain =
    'Shows short full-screen notices for major progress moments, so level-ups and completed research are hard to miss.';

  constructor({ gameplayFacade, playerFacade, playerShopFacade } = {}) {
    this.manager = new PageAnnouncementManager({
      gameplayFacade,
      playerFacade,
      playerShopFacade,
    });
  }

  mount(stage) {
    this.manager.mount(stage);
  }

  unmount() {
    this.manager.unmount();
  }
}

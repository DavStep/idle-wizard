import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopPageNameManager } from './managers/WorkshopPageNameManager.js';
import { WorkshopPageNavigationManager } from './managers/WorkshopPageNavigationManager.js';
import { WorkshopSeedInventoryManager } from './managers/WorkshopSeedInventoryManager.js';
import { WorkshopSeedSummonButtonManager } from './managers/WorkshopSeedSummonButtonManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';

export class WorkshopPageFacade {
  static explain =
    'Shows the wizard workshop: a simple room with a wall behind it and a floor under it.';

  constructor({ gameplayFacade, leaderboardFacade, onShowResearch } = {}) {
    this.roomViewManager = new WorkshopRoomViewManager();
    this.seedInventoryManager = new WorkshopSeedInventoryManager({ gameplayFacade });
    this.seedSummonButtonManager = new WorkshopSeedSummonButtonManager({ gameplayFacade });
    this.leaderboardManager = new WorkshopLeaderboardManager({ gameplayFacade, leaderboardFacade });
    this.manaSphereManager = new WorkshopManaSphereManager({
      gameplayFacade,
      onSeedsClick: () => this.seedInventoryManager.toggle(),
    });
    this.navigationManager = new WorkshopPageNavigationManager({ onShowResearch });
    this.pageNameManager = new WorkshopPageNameManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.manaSphereManager.mount(uiLayer);
    this.seedSummonButtonManager.mount(uiLayer);
    this.leaderboardManager.mount(uiLayer);
    this.seedInventoryManager.mount(uiLayer);
    this.navigationManager.mount(uiLayer);
    this.pageNameManager.mount(uiLayer);
  }

  unmount() {
    this.pageNameManager.unmount();
    this.navigationManager.unmount();
    this.seedInventoryManager.unmount();
    this.leaderboardManager.unmount();
    this.seedSummonButtonManager.unmount();
    this.manaSphereManager.unmount();
    this.roomViewManager.unmount();
  }
}

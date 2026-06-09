import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopPageNameManager } from './managers/WorkshopPageNameManager.js';
import { WorkshopPageNavigationManager } from './managers/WorkshopPageNavigationManager.js';
import { WorkshopSeedInventoryManager } from './managers/WorkshopSeedInventoryManager.js';
import { WorkshopSeedBlockManager } from './managers/WorkshopSeedBlockManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';
import { WorkshopWorldChatManager } from './managers/WorkshopWorldChatManager.js';
import { WorkshopFlyoutManager } from './managers/WorkshopFlyoutManager.js';
import { WorkshopLogDialogManager } from './managers/WorkshopLogDialogManager.js';

export class WorkshopPageFacade {
  static explain =
    'Shows the wizard workshop: a simple room with a wall behind it and a floor under it.';

  constructor({
    gameplayFacade,
    leaderboardFacade,
    worldChatFacade,
    onShowGarden,
    onShowResearch,
  } = {}) {
    this.roomViewManager = new WorkshopRoomViewManager();
    this.flyoutManager = new WorkshopFlyoutManager();
    this.seedInventoryManager = new WorkshopSeedInventoryManager({ gameplayFacade });
    this.seedBlockManager = new WorkshopSeedBlockManager({
      gameplayFacade,
      onSeedsClick: () => this.seedInventoryManager.toggle(),
      onSummonNotice: (message) => this.flyoutManager.show(message),
    });
    this.leaderboardManager = new WorkshopLeaderboardManager({ gameplayFacade, leaderboardFacade });
    this.worldChatManager = new WorkshopWorldChatManager({ worldChatFacade });
    this.logDialogManager = new WorkshopLogDialogManager({ gameplayFacade });
    this.manaSphereManager = new WorkshopManaSphereManager({ gameplayFacade });
    this.navigationManager = new WorkshopPageNavigationManager({ onShowGarden, onShowResearch });
    this.pageNameManager = new WorkshopPageNameManager();
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.flyoutManager.mount(uiLayer);
    this.manaSphereManager.mount(uiLayer);
    this.seedBlockManager.mount(uiLayer);
    this.leaderboardManager.mount(uiLayer);
    this.worldChatManager.mount(uiLayer);
    this.logDialogManager.mount(uiLayer);
    this.seedInventoryManager.mount(uiLayer);
    this.navigationManager.mount(uiLayer);
    this.pageNameManager.mount(uiLayer);
  }

  unmount() {
    this.pageNameManager.unmount();
    this.navigationManager.unmount();
    this.seedInventoryManager.unmount();
    this.logDialogManager.unmount();
    this.worldChatManager.unmount();
    this.leaderboardManager.unmount();
    this.seedBlockManager.unmount();
    this.flyoutManager.unmount();
    this.manaSphereManager.unmount();
    this.roomViewManager.unmount();
  }
}

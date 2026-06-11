import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopSeedInventoryManager } from './managers/WorkshopSeedInventoryManager.js';
import { WorkshopSeedBlockManager } from './managers/WorkshopSeedBlockManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';
import { WorkshopFlyoutManager } from './managers/WorkshopFlyoutManager.js';
import { WorkshopLogDialogManager } from './managers/WorkshopLogDialogManager.js';
import { WorkshopDiscoveriesManager } from './managers/WorkshopDiscoveriesManager.js';
import { WorkshopTaskManager } from './managers/WorkshopTaskManager.js';
import { WorkshopTradeAllianceManager } from './managers/WorkshopTradeAllianceManager.js';

export class WorkshopPageFacade {
  static explain =
    'Shows the wizard workshop: a simple room with a wall behind it and a floor under it.';

  constructor({
    gameplayFacade,
    leaderboardFacade,
    tradeAllianceFacade,
  } = {}) {
    this.roomViewManager = new WorkshopRoomViewManager();
    this.flyoutManager = new WorkshopFlyoutManager();
    this.seedInventoryManager = new WorkshopSeedInventoryManager({ gameplayFacade });
    this.seedBlockManager = new WorkshopSeedBlockManager({
      gameplayFacade,
      onSeedsClick: () => this.seedInventoryManager.toggle(),
      onSummonNotice: (message) => this.flyoutManager.show(message),
    });
    this.leaderboardManager = new WorkshopLeaderboardManager({
      gameplayFacade,
      leaderboardFacade,
      tradeAllianceFacade,
    });
    this.tradeAllianceManager = new WorkshopTradeAllianceManager({ tradeAllianceFacade });
    this.logDialogManager = new WorkshopLogDialogManager({ gameplayFacade });
    this.discoveriesManager = new WorkshopDiscoveriesManager({ gameplayFacade });
    this.manaSphereManager = new WorkshopManaSphereManager({ gameplayFacade });
    this.taskManager = new WorkshopTaskManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.taskManager.mount(uiLayer);
    this.manaSphereManager.mount(uiLayer);
    this.seedBlockManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.leaderboardManager.mount(uiLayer, popupLayer);
    this.tradeAllianceManager.mount(uiLayer, popupLayer);
    this.logDialogManager.mount(uiLayer, popupLayer);
    this.discoveriesManager.mount(uiLayer, popupLayer);
    this.seedInventoryManager.mount(popupLayer);
  }

  unmount() {
    this.seedInventoryManager.unmount();
    this.discoveriesManager.unmount();
    this.logDialogManager.unmount();
    this.tradeAllianceManager.unmount();
    this.leaderboardManager.unmount();
    this.taskManager.unmount();
    this.seedBlockManager.unmount();
    this.flyoutManager.unmount();
    this.manaSphereManager.unmount();
    this.roomViewManager.unmount();
  }
}

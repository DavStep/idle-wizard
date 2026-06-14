import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopBagManager } from './managers/WorkshopBagManager.js';
import { WorkshopActionBarManager } from './managers/WorkshopActionBarManager.js';
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
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new WorkshopRoomViewManager();
    this.flyoutManager = new WorkshopFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.bagManager = new WorkshopBagManager({ gameplayFacade });
    this.actionBarManager = new WorkshopActionBarManager({
      gameplayFacade,
      onBagClick: () => this.bagManager.toggle(),
      onSummonNotice: (message) => this.flyoutManager.show(message),
      rewardEventsAvailable: Boolean(gameplayFacade?.subscribeRewardEvents),
    });
    this.leaderboardManager = new WorkshopLeaderboardManager({
      gameplayFacade,
      leaderboardFacade,
      tradeAllianceFacade,
    });
    this.tradeAllianceManager = new WorkshopTradeAllianceManager({
      gameplayFacade,
      tradeAllianceFacade,
    });
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
    this.actionBarManager.mount(uiLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
    this.leaderboardManager.mount(uiLayer, popupLayer);
    this.tradeAllianceManager.mount(uiLayer, popupLayer);
    this.logDialogManager.mount(uiLayer, popupLayer);
    this.discoveriesManager.mount(uiLayer, popupLayer);
    this.bagManager.mount(popupLayer);
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.bagManager.unmount();
    this.discoveriesManager.unmount();
    this.logDialogManager.unmount();
    this.tradeAllianceManager.unmount();
    this.leaderboardManager.unmount();
    this.taskManager.unmount();
    this.actionBarManager.unmount();
    this.flyoutManager.unmount();
    this.manaSphereManager.unmount();
    this.roomViewManager.unmount();
  }
}

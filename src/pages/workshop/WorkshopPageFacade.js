import { WorkshopRoomViewManager } from './managers/WorkshopRoomViewManager.js';
import { WorkshopManaSphereManager } from './managers/WorkshopManaSphereManager.js';
import { WorkshopBagManager } from './managers/WorkshopBagManager.js';
import { WorkshopActionBarManager } from './managers/WorkshopActionBarManager.js';
import { WorkshopLeaderboardManager } from './managers/WorkshopLeaderboardManager.js';
import { WorkshopFlyoutManager } from './managers/WorkshopFlyoutManager.js';
import { WorkshopLogDialogManager } from './managers/WorkshopLogDialogManager.js';
import { WorkshopDiscoveriesManager } from './managers/WorkshopDiscoveriesManager.js';
import { WorkshopPrestigeManager } from './managers/WorkshopPrestigeManager.js';
import { WorkshopTaskManager } from './managers/WorkshopTaskManager.js';
import { WorkshopTradeAllianceManager } from './managers/WorkshopTradeAllianceManager.js';
import { WorkshopSecondaryActionGateManager } from './managers/WorkshopSecondaryActionGateManager.js';

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
    this.secondaryActionGateUnsubscribe = null;
    this.secondaryActionGateManager = new WorkshopSecondaryActionGateManager();
    this.bagManager = new WorkshopBagManager({ gameplayFacade });
    this.prestigeManager = new WorkshopPrestigeManager({ gameplayFacade });
    this.actionBarManager = new WorkshopActionBarManager({
      gameplayFacade,
      onBagClick: () => this.bagManager.toggle(),
      onPrestigeClick: () => this.prestigeManager.toggle(),
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
    this.prestigeManager.mount(popupLayer);
    this.secondaryActionGateUnsubscribe =
      this.gameplayFacade?.subscribe((snapshot) => this.applySecondaryActionGate(snapshot)) ??
      null;
    this.applySecondaryActionGate(this.gameplayFacade?.getSnapshot?.());
  }

  unmount() {
    this.secondaryActionGateUnsubscribe?.();
    this.secondaryActionGateUnsubscribe = null;
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.prestigeManager.unmount();
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

  applySecondaryActionGate(snapshot) {
    const unlocked = this.secondaryActionGateManager.apply(snapshot, [
      this.actionBarManager.refs.prestigeButton,
      this.leaderboardManager.root,
      this.tradeAllianceManager.root,
      this.logDialogManager.root,
      this.discoveriesManager.root,
    ]);

    if (unlocked) {
      return;
    }

    this.prestigeManager.hide();
    this.leaderboardManager.hide();
    this.tradeAllianceManager.hide();
    this.logDialogManager.hide();
    this.discoveriesManager.hide();
  }
}

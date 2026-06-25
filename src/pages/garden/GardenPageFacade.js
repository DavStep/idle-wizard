import { GardenPlotManager } from './managers/GardenPlotManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';
import { WorkshopWorldNoticeManager } from '../workshop/managers/WorkshopWorldNoticeManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page: plots for growing herbs, with world event access when available.';

  constructor({
    gameplayFacade,
    playerFacade,
    worldEventLeaderboardFacade,
    onOpenPlayerInfo,
    pixiProgressOverlayManager = null,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new GardenRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.plotManager = new GardenPlotManager({
      gameplayFacade,
      playerFacade,
      pixiProgressOverlayManager,
    });
    this.worldNoticeManager = new WorkshopWorldNoticeManager({
      gameplayFacade,
      playerFacade,
      worldEventLeaderboardFacade,
      onOpenPlayerInfo,
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const contentLayer = this.roomViewManager.getContentLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.plotManager.mount(contentLayer, popupLayer);
    this.worldNoticeManager.mount(contentLayer, popupLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.flyoutManager.unmount();
    this.worldNoticeManager.unmount();
    this.plotManager.unmount();
    this.roomViewManager.unmount();
  }
}

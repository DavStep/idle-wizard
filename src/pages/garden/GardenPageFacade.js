import { GardenPlotManager } from './managers/GardenPlotManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page: a plot world for growing herbs, seed choices, and harvest feedback.';

  constructor({
    gameplayFacade,
    pixiProgressOverlayManager = null,
  } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new GardenRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.plotManager = new GardenPlotManager({
      gameplayFacade,
      pixiProgressOverlayManager,
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const contentLayer = this.roomViewManager.getContentLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.plotManager.mount(contentLayer, popupLayer);
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
    this.plotManager.unmount();
    this.roomViewManager.unmount();
  }
}

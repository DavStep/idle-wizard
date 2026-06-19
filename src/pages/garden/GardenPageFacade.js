import { GardenHerbInventoryManager } from './managers/GardenHerbInventoryManager.js';
import { GardenPlotManager } from './managers/GardenPlotManager.js';
import { GardenRoomViewManager } from './managers/GardenRoomViewManager.js';
import { RewardFlyoutManager } from '../shared/RewardFlyoutManager.js';

export class GardenPageFacade {
  static explain =
    'Shows the garden room page, a quiet place between brewing and the workshop for later plant work.';

  constructor({ gameplayFacade, playerFacade } = {}) {
    this.gameplayFacade = gameplayFacade;
    this.roomViewManager = new GardenRoomViewManager();
    this.flyoutManager = new RewardFlyoutManager();
    this.rewardEventsUnsubscribe = null;
    this.plotManager = new GardenPlotManager({ gameplayFacade, playerFacade });
    this.herbInventoryManager = new GardenHerbInventoryManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.plotManager.mount(uiLayer, popupLayer);
    this.flyoutManager.mount(uiLayer);
    this.rewardEventsUnsubscribe =
      this.gameplayFacade?.subscribeRewardEvents?.((event) =>
        this.flyoutManager.showReward(event),
      ) ?? null;
    this.herbInventoryManager.mount(uiLayer);
  }

  unmount() {
    this.rewardEventsUnsubscribe?.();
    this.rewardEventsUnsubscribe = null;
    this.herbInventoryManager.unmount();
    this.flyoutManager.unmount();
    this.plotManager.unmount();
    this.roomViewManager.unmount();
  }
}

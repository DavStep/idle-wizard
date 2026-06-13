import { ResearchBoxListManager } from './managers/ResearchBoxListManager.js';
import { ResearchInfoDialogManager } from './managers/ResearchInfoDialogManager.js';
import { ResearchRoomViewManager } from './managers/ResearchRoomViewManager.js';

export class ResearchPageFacade {
  static explain =
    'Shows the research room, where the player can see studies for future upgrades and unlocks.';

  constructor({ gameplayFacade, onSelectedTabChange } = {}) {
    this.roomViewManager = new ResearchRoomViewManager();
    this.infoDialogManager = new ResearchInfoDialogManager();
    this.boxListManager = new ResearchBoxListManager({
      gameplayFacade,
      onSelectedTabChange,
      onShowResearchInfo: (research) => this.infoDialogManager.show(research),
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    const popupLayer = this.roomViewManager.getPopupLayer();
    this.boxListManager.mount(uiLayer);
    this.infoDialogManager.mount(popupLayer);
  }

  unmount() {
    this.infoDialogManager.unmount();
    this.boxListManager.unmount();
    this.roomViewManager.unmount();
  }
}

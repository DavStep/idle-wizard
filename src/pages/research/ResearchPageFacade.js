import { ResearchBoxListManager } from './managers/ResearchBoxListManager.js';
import { ResearchInfoDialogManager } from './managers/ResearchInfoDialogManager.js';
import { ResearchRoomViewManager } from './managers/ResearchRoomViewManager.js';

export class ResearchPageFacade {
  static explain =
    'Shows the research room, where the player can see studies for future upgrades and unlocks.';

  constructor({ gameplayFacade } = {}) {
    this.roomViewManager = new ResearchRoomViewManager();
    this.infoDialogManager = new ResearchInfoDialogManager();
    this.boxListManager = new ResearchBoxListManager({
      gameplayFacade,
      onShowResearchInfo: (research) => this.infoDialogManager.show(research),
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.boxListManager.mount(uiLayer);
    this.infoDialogManager.mount(uiLayer);
  }

  unmount() {
    this.infoDialogManager.unmount();
    this.boxListManager.unmount();
    this.roomViewManager.unmount();
  }
}

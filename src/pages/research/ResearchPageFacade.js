import { ResearchBoxListManager } from './managers/ResearchBoxListManager.js';
import { ResearchCardSkinManager } from './managers/ResearchCardSkinManager.js';
import { ResearchRoomViewManager } from './managers/ResearchRoomViewManager.js';

export class ResearchPageFacade {
  static explain =
    'Shows the research room, where the player can see studies for future upgrades and unlocks.';

  constructor({
    gameplayFacade,
    onSelectedTabChange,
    cardSkinManager = new ResearchCardSkinManager(),
  } = {}) {
    this.roomViewManager = new ResearchRoomViewManager();
    this.cardSkinManager = cardSkinManager;
    this.boxListManager = new ResearchBoxListManager({
      gameplayFacade,
      onSelectedTabChange,
      onRowsChanged: () => this.cardSkinManager.scheduleSync(),
    });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    const uiLayer = this.roomViewManager.getUiLayer();
    this.boxListManager.mount(uiLayer);
    this.cardSkinManager.mount(uiLayer);
  }

  unmount() {
    this.cardSkinManager.unmount();
    this.boxListManager.unmount();
    this.roomViewManager.unmount();
  }
}

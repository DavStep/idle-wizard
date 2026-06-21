import { PrestigePanelManager } from './managers/PrestigePanelManager.js';
import { PrestigeRoomViewManager } from './managers/PrestigeRoomViewManager.js';

export class PrestigePageFacade {
  static explain =
    'Shows the prestige room, where completed runs turn into permanent ruby and capacity progress.';

  constructor({ gameplayFacade } = {}) {
    this.roomViewManager = new PrestigeRoomViewManager();
    this.panelManager = new PrestigePanelManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    this.panelManager.mount(this.roomViewManager.getUiLayer());
  }

  unmount() {
    this.panelManager.unmount();
    this.roomViewManager.unmount();
  }
}

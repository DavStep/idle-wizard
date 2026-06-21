import { GuildPanelManager } from './managers/GuildPanelManager.js';
import { GuildRoomViewManager } from './managers/GuildRoomViewManager.js';

export class GuildPageFacade {
  static explain =
    'Shows the private guild hall where adventurers apply, live, and take request-board work on their own.';

  constructor({ gameplayFacade } = {}) {
    this.roomViewManager = new GuildRoomViewManager();
    this.panelManager = new GuildPanelManager({ gameplayFacade });
  }

  mount(stage) {
    this.roomViewManager.mount(stage);
    this.panelManager.mount(
      this.roomViewManager.getUiLayer(),
      this.roomViewManager.getPopupLayer(),
    );
  }

  unmount() {
    this.panelManager.unmount();
    this.roomViewManager.unmount();
  }
}

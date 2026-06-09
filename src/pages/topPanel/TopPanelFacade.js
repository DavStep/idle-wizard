import { TopPanelResourceDisplayManager } from './managers/TopPanelResourceDisplayManager.js';
import { TopPanelUsernameEditManager } from './managers/TopPanelUsernameEditManager.js';
import { TopPanelViewManager } from './managers/TopPanelViewManager.js';

export class TopPanelFacade {
  static explain =
    'Shows the small always-visible room header with the player name and current resources.';

  constructor({ gameplayFacade, playerFacade } = {}) {
    this.viewManager = new TopPanelViewManager();
    this.resourceDisplayManager = new TopPanelResourceDisplayManager({ gameplayFacade });
    this.usernameEditManager = new TopPanelUsernameEditManager({ playerFacade });
  }

  mount(stage) {
    this.viewManager.mount(stage);
    const refs = this.viewManager.getRefs();
    this.resourceDisplayManager.mount(refs);
    this.usernameEditManager.mount(refs);
  }

  unmount() {
    this.usernameEditManager.unmount();
    this.resourceDisplayManager.unmount();
    this.viewManager.unmount();
  }
}

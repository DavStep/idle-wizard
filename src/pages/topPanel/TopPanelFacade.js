import { TopPanelAuthManager } from './managers/TopPanelAuthManager.js';
import { TopPanelResourceDisplayManager } from './managers/TopPanelResourceDisplayManager.js';
import { TopPanelSettingsManager } from './managers/TopPanelSettingsManager.js';
import { TopPanelViewManager } from './managers/TopPanelViewManager.js';

export class TopPanelFacade {
  static explain =
    'Shows the small always-visible room header with the player name and current resources.';

  constructor({ gameplayFacade, playerFacade, authFacade } = {}) {
    this.viewManager = new TopPanelViewManager();
    this.authManager = new TopPanelAuthManager({ authFacade });
    this.resourceDisplayManager = new TopPanelResourceDisplayManager({ gameplayFacade });
    this.settingsManager = new TopPanelSettingsManager({ playerFacade });
  }

  mount(stage) {
    this.viewManager.mount(stage);
    const refs = this.viewManager.getRefs();
    this.authManager.mount(refs);
    this.resourceDisplayManager.mount(refs);
    this.settingsManager.mount(refs);
  }

  unmount() {
    this.settingsManager.unmount();
    this.resourceDisplayManager.unmount();
    this.authManager.unmount();
    this.viewManager.unmount();
  }
}

import { TopPanelAuthManager } from './managers/TopPanelAuthManager.js';
import { TopPanelLevelManager } from './managers/TopPanelLevelManager.js';
import { TopPanelResourceDisplayManager } from './managers/TopPanelResourceDisplayManager.js';
import { TopPanelSettingsManager } from './managers/TopPanelSettingsManager.js';
import { TopPanelUsernamePromptManager } from './managers/TopPanelUsernamePromptManager.js';
import { TopPanelViewManager } from './managers/TopPanelViewManager.js';

export class TopPanelFacade {
  static explain =
    'Shows the small always-visible room header with the player name and current resources.';

  constructor({ gameplayFacade, playerFacade, authFacade, feedbackFacade } = {}) {
    this.viewManager = new TopPanelViewManager();
    this.authManager = new TopPanelAuthManager({ authFacade });
    this.levelManager = new TopPanelLevelManager({ gameplayFacade });
    this.resourceDisplayManager = new TopPanelResourceDisplayManager({ gameplayFacade });
    this.settingsManager = new TopPanelSettingsManager({
      gameplayFacade,
      playerFacade,
      feedbackFacade,
    });
    this.usernamePromptManager = new TopPanelUsernamePromptManager({
      playerFacade,
      settingsManager: this.settingsManager,
    });
  }

  mount(stage) {
    this.viewManager.mount(stage);
    const refs = this.viewManager.getRefs();
    this.authManager.mount(refs);
    this.levelManager.mount(refs);
    this.resourceDisplayManager.mount(refs);
    this.settingsManager.mount(refs);
    this.usernamePromptManager.mount();
  }

  unmount() {
    this.usernamePromptManager.unmount();
    this.settingsManager.unmount();
    this.resourceDisplayManager.unmount();
    this.levelManager.unmount();
    this.authManager.unmount();
    this.viewManager.unmount();
  }
}

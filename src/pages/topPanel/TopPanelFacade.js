import { TopPanelAuthManager } from './managers/TopPanelAuthManager.js';
import { TopPanelFitManager } from './managers/TopPanelFitManager.js';
import { TopPanelInboxManager } from './managers/TopPanelInboxManager.js';
import { TopPanelLevelManager } from './managers/TopPanelLevelManager.js';
import { TopPanelResourceDisplayManager } from './managers/TopPanelResourceDisplayManager.js';
import { TopPanelSettingsManager } from './managers/TopPanelSettingsManager.js';
import { TopPanelUsernamePromptManager } from './managers/TopPanelUsernamePromptManager.js';
import { TopPanelViewManager } from './managers/TopPanelViewManager.js';

export class TopPanelFacade {
  static explain =
    'Shows the small always-visible room header with the player name and current resources.';

  constructor({
    gameplayFacade,
    playerFacade,
    authFacade,
    feedbackFacade,
    playerInboxFacade,
    hapticsFacade,
    soundSettingsFacade,
  } = {}) {
    this.viewManager = new TopPanelViewManager();
    this.authManager = new TopPanelAuthManager({ authFacade, gameplayFacade });
    this.fitManager = new TopPanelFitManager();
    this.levelManager = new TopPanelLevelManager({ gameplayFacade });
    this.inboxManager = new TopPanelInboxManager({ playerInboxFacade });
    this.resourceDisplayManager = new TopPanelResourceDisplayManager({ gameplayFacade });
    this.settingsManager = new TopPanelSettingsManager({
      gameplayFacade,
      playerFacade,
      feedbackFacade,
      hapticsFacade,
      soundSettingsFacade,
    });
    this.usernamePromptManager = new TopPanelUsernamePromptManager({
      playerFacade,
    });
  }

  mount(stage) {
    this.viewManager.mount(stage);
    const refs = this.viewManager.getRefs();
    this.authManager.mount(refs);
    this.levelManager.mount(refs);
    this.inboxManager.mount(refs);
    this.resourceDisplayManager.mount(refs);
    this.fitManager.mount(refs);
    this.settingsManager.mount(refs);
    this.usernamePromptManager.mount();
  }

  unmount() {
    this.usernamePromptManager.unmount();
    this.settingsManager.unmount();
    this.fitManager.unmount();
    this.resourceDisplayManager.unmount();
    this.inboxManager.unmount();
    this.levelManager.unmount();
    this.authManager.unmount();
    this.viewManager.unmount();
  }

  showInbox() {
    this.inboxManager.show();
  }

  showUsernamePrompt() {
    this.settingsManager.showUsernamePrompt();
  }

  setResourceContext(context = {}) {
    this.resourceDisplayManager.setContextCurrency(context.currency);
  }
}

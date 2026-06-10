export class TopPanelUsernamePromptManager {
  constructor({ playerFacade, settingsManager } = {}) {
    this.playerFacade = playerFacade;
    this.settingsManager = settingsManager;
    this.unsubscribe = null;
  }

  mount() {
    if (!this.playerFacade) {
      return;
    }

    this.unsubscribe = this.playerFacade.subscribe((snapshot) => this.render(snapshot));
    this.render(this.playerFacade.getSnapshot());
  }

  unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  render(snapshot) {
    if (!snapshot?.shouldPromptForUsername || this.settingsManager?.isVisible?.()) {
      return;
    }

    this.settingsManager?.showUsernamePrompt?.();
    this.playerFacade?.markUsernamePromptSeen?.();
  }
}

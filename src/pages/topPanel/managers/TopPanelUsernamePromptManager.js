export class TopPanelUsernamePromptManager {
  constructor({ playerFacade } = {}) {
    this.playerFacade = playerFacade;
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
    if (!snapshot?.shouldPromptForUsername) {
      return;
    }

    this.playerFacade?.markUsernamePromptSeen?.();
  }
}

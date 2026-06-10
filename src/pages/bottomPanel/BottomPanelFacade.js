import { BottomPanelViewManager } from './managers/BottomPanelViewManager.js';

export class BottomPanelFacade {
  static explain =
    'Shows the always-visible room tabs so the player can see every room and move between them.';

  constructor({ getCurrentPageId, onShowPage } = {}) {
    this.viewManager = new BottomPanelViewManager({ getCurrentPageId, onShowPage });
  }

  mount(stage) {
    this.viewManager.mount(stage);
  }

  unmount() {
    this.viewManager.unmount();
  }

  setCurrentPageId(pageId) {
    this.viewManager.setCurrentPageId(pageId);
  }
}

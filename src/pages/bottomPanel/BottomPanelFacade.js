import { BottomPanelViewManager } from './managers/BottomPanelViewManager.js';

export class BottomPanelFacade {
  static explain =
    'Shows the always-visible bottom room tabs and small bottom actions such as prestige.';

  constructor({ getCurrentPageId, onShowPage, onAction } = {}) {
    this.viewManager = new BottomPanelViewManager({ getCurrentPageId, onShowPage, onAction });
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

  setVisiblePageIds(pageIds) {
    this.viewManager.setVisiblePageIds(pageIds);
  }

  setPageStates(pageStates) {
    this.viewManager.setPageStates(pageStates);
  }

  setActionStates(actionStates) {
    this.viewManager.setActionStates(actionStates);
  }

  setNotifications(notifications) {
    this.viewManager.setNotifications(notifications);
  }

  setSwipeTargetPageId(pageId) {
    this.viewManager.setSwipeTargetPageId(pageId);
  }

  showLockedPage(pageId) {
    return this.viewManager.showLockedPage(pageId);
  }
}

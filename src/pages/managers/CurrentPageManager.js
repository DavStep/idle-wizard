export class CurrentPageManager {
  constructor({ pageRegistryManager, defaultPageId }) {
    this.pageRegistryManager = pageRegistryManager;
    this.defaultPageId = defaultPageId;
    this.stage = null;
    this.currentPageId = null;
    this.currentPage = null;
  }

  mount(stage) {
    this.stage = stage;
    this.show(this.defaultPageId);
  }

  unmount() {
    this.currentPage?.unmount();
    this.currentPageId = null;
    this.currentPage = null;
    this.stage = null;
  }

  show(pageId) {
    if (!this.stage) {
      throw new Error('CurrentPageManager requires a mounted stage before showing a page.');
    }

    if (this.currentPageId === pageId) {
      return;
    }

    this.currentPage?.unmount();
    this.currentPage = this.pageRegistryManager.get(pageId);
    this.currentPage.mount(this.stage);
    this.currentPageId = pageId;
  }

  getCurrentPageId() {
    return this.currentPageId;
  }
}

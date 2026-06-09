export class PageRegistryManager {
  constructor() {
    this.pages = new Map();
  }

  register(pageId, pageFacade) {
    if (!pageId) {
      throw new Error('PageRegistryManager requires a page id.');
    }

    if (!pageFacade || typeof pageFacade.mount !== 'function') {
      throw new Error('Page facades must expose mount(stage) and unmount() methods.');
    }

    this.pages.set(pageId, pageFacade);
  }

  get(pageId) {
    const page = this.pages.get(pageId);

    if (!page) {
      throw new Error(`Unknown page: ${pageId}`);
    }

    return page;
  }
}

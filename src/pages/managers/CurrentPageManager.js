export class CurrentPageManager {
  constructor({
    pageRegistryManager,
    defaultPageId,
    onPageActivate = () => {},
    onPageDeactivate = () => {},
  }) {
    this.pageRegistryManager = pageRegistryManager;
    this.defaultPageId = defaultPageId;
    this.onPageActivate = onPageActivate;
    this.onPageDeactivate = onPageDeactivate;
    this.stage = null;
    this.currentPageId = null;
    this.currentPage = null;
    this.pageSlot = null;
    this.pageEntries = new Map();
  }

  mount(stage) {
    this.stage = stage;
    this.pageSlot = stage.ownerDocument.createComment('current-page-slot');
    this.stage.append(this.pageSlot);
    this.show(this.defaultPageId);
  }

  unmount() {
    for (const entry of this.pageEntries.values()) {
      entry.page.unmount();
    }

    this.pageEntries.clear();
    this.pageSlot?.remove();
    this.pageSlot = null;
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

    const previousEntry = this.pageEntries.get(this.currentPageId);
    this.deactivatePage(previousEntry);

    try {
      const entry = this.getOrMountPage(pageId);
      this.activatePage(entry);
      this.currentPage = entry.page;
      this.currentPageId = pageId;
    } catch (error) {
      this.activatePage(previousEntry);
      throw error;
    }
  }

  getCurrentPageId() {
    return this.currentPageId;
  }

  getOrMountPage(pageId) {
    const cachedEntry = this.pageEntries.get(pageId);
    if (cachedEntry) {
      return cachedEntry;
    }

    const page = this.pageRegistryManager.get(pageId);
    const existingNodes = new Set(this.stage.childNodes);
    page.mount(this.stage);
    const nodes = [...this.stage.childNodes].filter(
      (node) => !existingNodes.has(node),
    );
    const entry = {
      pageId,
      page,
      nodes,
      cache: this.stage.ownerDocument.createDocumentFragment(),
      activationCount: 0,
    };
    this.pageEntries.set(pageId, entry);
    this.setPageActive(entry, true);
    return entry;
  }

  activatePage(entry) {
    if (!entry) {
      return;
    }

    const reused = entry.activationCount > 0;
    this.setPageActive(entry, true, { reused });
    if (entry.nodes.every((node) => this.stage.contains(node))) {
      this.onPageActivate(entry.pageId);
      entry.page.activate?.();
      entry.activationCount += 1;
      return;
    }

    const referenceNode = this.pageSlot.nextSibling;
    for (const node of entry.nodes) {
      this.stage.insertBefore(node, referenceNode);
    }
    this.onPageActivate(entry.pageId);
    entry.page.activate?.();
    entry.activationCount += 1;
  }

  deactivatePage(entry) {
    if (!entry) {
      return;
    }

    entry.page.deactivate?.();
    this.onPageDeactivate(entry.pageId);
    this.setPageActive(entry, false);
    for (const node of entry.nodes) {
      entry.cache.append(node);
    }
  }

  setPageActive(entry, active, { reused = false } = {}) {
    for (const node of entry.nodes) {
      if (!(node instanceof this.stage.ownerDocument.defaultView.Element)) {
        continue;
      }

      node.dataset.pageCacheState = active ? 'active' : 'inactive';
      if (active) {
        node.dataset.pageCacheActivation = reused ? 'reused' : 'initial';
      }
      node.inert = !active;
      if (active) {
        node.removeAttribute('inert');
        node.removeAttribute('aria-hidden');
      } else {
        node.setAttribute('inert', '');
        node.setAttribute('aria-hidden', 'true');
      }
    }
  }
}

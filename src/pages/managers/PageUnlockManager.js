import { DEFAULT_PAGE_SWIPE_ORDER } from './PageSwipeNavigationManager.js';

export class PageUnlockManager {
  constructor({ pageOrder = DEFAULT_PAGE_SWIPE_ORDER } = {}) {
    this.pageOrder = pageOrder;
  }

  getUnlockedPageIds() {
    return [...this.pageOrder];
  }

  isUnlocked(pageId) {
    return this.getUnlockedPageIds().includes(pageId);
  }
}

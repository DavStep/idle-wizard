import { PageUnlockManager } from '../../managers/PageUnlockManager.js';
import { isItemResearched } from '../../shared/itemResearchStatus.js';

const SELL_KIND_PAGE_IDS = {
  herb: 'garden',
  potion: 'brewing',
};

export class ShopStallVisibilityManager {
  constructor({ pageUnlockManager = new PageUnlockManager() } = {}) {
    this.pageUnlockManager = pageUnlockManager;
  }

  getVisibleSellKinds(snapshot, sellKinds = []) {
    return sellKinds.filter((sellKind) => {
      const pageId = SELL_KIND_PAGE_IDS[sellKind.kind];
      return !pageId || this.pageUnlockManager.isUnlocked(pageId, snapshot);
    });
  }

  isItemVisible(snapshot, item) {
    return isItemResearched(snapshot, item);
  }
}

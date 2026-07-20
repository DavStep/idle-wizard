import { MarketLicenceResolverManager } from './managers/MarketLicenceResolverManager.js';
import { MarketAccessManager } from './managers/MarketAccessManager.js';

export class MarketLicenceFacade {
  static explain =
    'Chooses the player’s permanent market licence from completed Prestige stars, so every market system uses the same protected economy.';

  constructor({ prestigeFacade } = {}) {
    this.prestigeFacade = prestigeFacade;
    this.marketLicenceResolverManager = new MarketLicenceResolverManager();
    this.marketAccessManager = new MarketAccessManager();
  }

  getActiveLicence() {
    return this.marketLicenceResolverManager.resolve(this.getCompletedStarCount());
  }

  getActiveMarketId() {
    return this.getActiveLicence().id;
  }

  getSnapshot() {
    const licence = this.getActiveLicence();

    return {
      ...licence,
      completedStars: this.getCompletedStarCount(),
    };
  }

  getStallCount() {
    return this.marketAccessManager.getStallCount(this.getActiveLicence());
  }

  getItemAccess(item) {
    return this.marketAccessManager.getItemAccess(item, this.getActiveLicence());
  }

  isItemTraded(item) {
    return this.getItemAccess(item).tradedHere;
  }

  getCompletedStarCount() {
    return this.prestigeFacade?.getCompletedCount?.() ?? 0;
  }
}

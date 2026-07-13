import { MarketLicenceResolverManager } from './managers/MarketLicenceResolverManager.js';

export class MarketLicenceFacade {
  static explain =
    'Chooses the player’s permanent market licence from completed Prestige stars, so every market system uses the same protected economy.';

  constructor({ prestigeFacade } = {}) {
    this.prestigeFacade = prestigeFacade;
    this.marketLicenceResolverManager = new MarketLicenceResolverManager();
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

  getCompletedStarCount() {
    return this.prestigeFacade?.getCompletedCount?.() ?? 0;
  }
}

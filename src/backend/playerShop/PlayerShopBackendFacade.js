import { PlayerShopListingManager } from './managers/PlayerShopListingManager.js';
import { PlayerShopStateObserverManager } from './managers/PlayerShopStateObserverManager.js';
import { PlayerShopSubscriptionManager } from './managers/PlayerShopSubscriptionManager.js';

export class PlayerShopBackendFacade {
  static explain =
    'Shares player market listings and request rows through the server so players can see each other\'s market offers.';

  constructor() {
    this.stateObserverManager = new PlayerShopStateObserverManager();
    this.subscriptionManager = new PlayerShopSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.listingManager = new PlayerShopListingManager();
    this.marketDataRetainCount = 0;
    this.tradeHistoryRetainCount = 0;
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection, identity);
    this.listingManager.connect(connection);
  }

  disconnect() {
    this.marketDataRetainCount = 0;
    this.tradeHistoryRetainCount = 0;
    this.listingManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  retainPublicData() {
    const releaseMarketData = this.retainMarketData();
    const releaseTradeHistory = this.retainTradeHistory();

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      releaseMarketData();
      releaseTradeHistory();
    };
  }

  retainMarketData() {
    this.marketDataRetainCount += 1;
    this.subscriptionManager.setMarketDataActive(true);

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.marketDataRetainCount = Math.max(0, this.marketDataRetainCount - 1);
      this.subscriptionManager.setMarketDataActive(this.marketDataRetainCount > 0);
    };
  }

  retainTradeHistory() {
    this.tradeHistoryRetainCount += 1;
    this.subscriptionManager.setTradeHistoryActive(true);

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.tradeHistoryRetainCount = Math.max(0, this.tradeHistoryRetainCount - 1);
      this.subscriptionManager.setTradeHistoryActive(this.tradeHistoryRetainCount > 0);
    };
  }

  setSlotListing(slot) {
    return this.listingManager.setSlotListing(slot);
  }

  clearSlotListing(slotNumber) {
    return this.listingManager.clearSlotListing(slotNumber);
  }

  setSlotRequest(slot) {
    return this.listingManager.setSlotRequest(slot);
  }

  clearSlotRequest(slotNumber) {
    return this.listingManager.clearSlotRequest(slotNumber);
  }

  buyListing(listing) {
    return this.listingManager.buyListing(listing);
  }

  claimProceeds() {
    return this.listingManager.claimProceeds();
  }

  clearOwnProgress() {
    return this.listingManager.clearOwnProgress();
  }
}

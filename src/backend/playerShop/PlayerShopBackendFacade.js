import { PlayerShopListingManager } from './managers/PlayerShopListingManager.js';
import { PlayerShopStateObserverManager } from './managers/PlayerShopStateObserverManager.js';
import { PlayerShopSubscriptionManager } from './managers/PlayerShopSubscriptionManager.js';
import { defaultMarketId, isMarketId } from '../../shared/marketLicence.js';

export class PlayerShopBackendFacade {
  static explain =
    'Shares player listings and requests through the server only with players in the same permanent market licence.';

  constructor() {
    this.stateObserverManager = new PlayerShopStateObserverManager();
    this.subscriptionManager = new PlayerShopSubscriptionManager({
      onSnapshot: (snapshot) => {
        if (!this.devSnapshot) {
          this.stateObserverManager.publish(snapshot);
        }
      },
    });
    this.listingManager = new PlayerShopListingManager();
    this.marketDataRetainCount = 0;
    this.tradeHistoryRetainCount = 0;
    this.devSnapshot = null;
    this.activeMarketId = defaultMarketId;
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
    if (this.devSnapshot) {
      return this.devSnapshot;
    }

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

  setActiveMarketId(marketId) {
    this.activeMarketId = isMarketId(marketId) ? marketId : defaultMarketId;
    this.listingManager.setActiveMarketId(this.activeMarketId);
    this.subscriptionManager.setActiveMarketId(this.activeMarketId);
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

  setDevSnapshot(snapshot) {
    this.devSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : null;
    this.stateObserverManager.publish(this.getSnapshot());
    return {
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }

  clearDevSnapshot() {
    this.devSnapshot = null;
    this.stateObserverManager.publish(this.getSnapshot());
    return {
      ok: true,
      snapshot: this.getSnapshot(),
    };
  }
}

import { PlayerShopListingManager } from './managers/PlayerShopListingManager.js';
import { PlayerShopStateObserverManager } from './managers/PlayerShopStateObserverManager.js';
import { PlayerShopSubscriptionManager } from './managers/PlayerShopSubscriptionManager.js';

export class PlayerShopBackendFacade {
  static explain =
    'Shares player market listings through the server so one player can buy another player\'s listed items.';

  constructor() {
    this.stateObserverManager = new PlayerShopStateObserverManager();
    this.subscriptionManager = new PlayerShopSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.listingManager = new PlayerShopListingManager();
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection, identity);
    this.listingManager.connect(connection);
  }

  disconnect() {
    this.listingManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  setSlotListing(slot) {
    return this.listingManager.setSlotListing(slot);
  }

  clearSlotListing(slotNumber) {
    return this.listingManager.clearSlotListing(slotNumber);
  }

  buyListing(listing) {
    return this.listingManager.buyListing(listing);
  }

  claimProceeds() {
    return this.listingManager.claimProceeds();
  }
}

import { PotionDiscoverySendManager } from './managers/PotionDiscoverySendManager.js';
import { PotionDiscoveryStateObserverManager } from './managers/PotionDiscoveryStateObserverManager.js';
import { PotionDiscoverySubscriptionManager } from './managers/PotionDiscoverySubscriptionManager.js';

export class PotionDiscoveryBackendFacade {
  static explain =
    'Shares unknown potion recipe discoveries through the server so every player learns the recipe once one wizard finds it.';

  constructor() {
    this.stateObserverManager = new PotionDiscoveryStateObserverManager();
    this.devSnapshot = null;
    this.subscriptionManager = new PotionDiscoverySubscriptionManager({
      onSnapshot: (snapshot) => {
        if (!this.devSnapshot) {
          this.stateObserverManager.publish(snapshot);
        }
      },
    });
    this.sendManager = new PotionDiscoverySendManager();
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
    this.sendManager.connect(connection);
  }

  disconnect() {
    this.sendManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.devSnapshot ?? this.subscriptionManager.getSnapshot();
  }

  getDiscovery(potionKey) {
    if (this.devSnapshot) {
      return (
        this.devSnapshot.discoveries?.find(
          (discovery) => discovery.potionKey === potionKey,
        ) ?? null
      );
    }
    return this.subscriptionManager.getDiscovery(potionKey);
  }

  hasDiscoveredPotion(potionKey) {
    if (this.devSnapshot) {
      return this.getDiscovery(potionKey) !== null;
    }
    return this.subscriptionManager.hasDiscoveredPotion(potionKey);
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  discoverPotionRecipe(potionKey) {
    return this.sendManager.discoverPotionRecipe(potionKey);
  }

  setDevSnapshot(snapshot) {
    this.devSnapshot = snapshot;
    this.stateObserverManager.publish(snapshot);
    return { ok: true, snapshot };
  }

  clearDevSnapshot() {
    this.devSnapshot = null;
    const snapshot = this.subscriptionManager.getSnapshot();
    this.stateObserverManager.publish(snapshot);
    return { ok: true, snapshot };
  }
}

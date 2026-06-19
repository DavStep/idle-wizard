import { PlayerInfoStateObserverManager } from './managers/PlayerInfoStateObserverManager.js';
import { PlayerInfoSubscriptionManager } from './managers/PlayerInfoSubscriptionManager.js';

export class PlayerInfoBackendFacade {
  static explain =
    'Provides a small public profile card for players already visible in chat, leaderboards, alliances, or the market.';

  constructor() {
    this.stateObserverManager = new PlayerInfoStateObserverManager();
    this.subscriptionManager = new PlayerInfoSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.connection = null;
    this.publicDataRetainCount = 0;
    this.publicDataActive = false;
  }

  connect(connection) {
    if (this.publicDataActive) {
      this.subscriptionManager.disconnect();
      this.publicDataActive = false;
    }

    this.connection = connection;
    this.syncPublicDataSubscription();
  }

  disconnect() {
    this.connection = null;
    this.publicDataRetainCount = 0;
    this.publicDataActive = false;
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  retainPublicData() {
    this.publicDataRetainCount += 1;
    this.syncPublicDataSubscription();

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.publicDataRetainCount = Math.max(0, this.publicDataRetainCount - 1);
      this.syncPublicDataSubscription();
    };
  }

  syncPublicDataSubscription() {
    const shouldBeActive = Boolean(this.connection && this.publicDataRetainCount > 0);

    if (shouldBeActive && !this.publicDataActive) {
      this.subscriptionManager.connect(this.connection);
      this.publicDataActive = true;
      return;
    }

    if (!shouldBeActive && this.publicDataActive) {
      this.subscriptionManager.disconnect();
      this.publicDataActive = false;
    }
  }
}

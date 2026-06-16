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
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
  }

  disconnect() {
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }
}

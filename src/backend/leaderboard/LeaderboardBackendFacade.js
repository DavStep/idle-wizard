import { LeaderboardStateObserverManager } from './managers/LeaderboardStateObserverManager.js';
import { LeaderboardSubscriptionManager } from './managers/LeaderboardSubscriptionManager.js';

export class LeaderboardBackendFacade {
  static explain =
    'Watches the shared server leaderboard so every player can see the same top earners.';

  constructor() {
    this.stateObserverManager = new LeaderboardStateObserverManager();
    this.subscriptionManager = new LeaderboardSubscriptionManager({
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

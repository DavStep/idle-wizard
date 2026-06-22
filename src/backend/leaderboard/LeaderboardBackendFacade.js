import { LeaderboardStateObserverManager } from './managers/LeaderboardStateObserverManager.js';
import { LeaderboardGeneratedCoinSyncManager } from './managers/LeaderboardGeneratedCoinSyncManager.js';
import { LeaderboardSubscriptionManager } from './managers/LeaderboardSubscriptionManager.js';

export class LeaderboardBackendFacade {
  static explain =
    'Watches the shared server leaderboard so every player can see the same top earners.';

  constructor() {
    this.stateObserverManager = new LeaderboardStateObserverManager();
    this.generatedCoinSyncManager = new LeaderboardGeneratedCoinSyncManager();
    this.subscriptionManager = new LeaderboardSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
  }

  setGameplayFacade(gameplayFacade) {
    this.generatedCoinSyncManager.setGameplayFacade(gameplayFacade);
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection, identity);
    this.generatedCoinSyncManager.connect(connection);
  }

  disconnect() {
    this.subscriptionManager.disconnect();
    this.generatedCoinSyncManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }
}

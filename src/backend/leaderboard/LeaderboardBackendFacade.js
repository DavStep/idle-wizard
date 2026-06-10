import { LeaderboardStateObserverManager } from './managers/LeaderboardStateObserverManager.js';
import { LeaderboardGeneratedGoldSyncManager } from './managers/LeaderboardGeneratedGoldSyncManager.js';
import { LeaderboardSubscriptionManager } from './managers/LeaderboardSubscriptionManager.js';

export class LeaderboardBackendFacade {
  static explain =
    'Watches the shared server leaderboard so every player can see the same top earners.';

  constructor() {
    this.stateObserverManager = new LeaderboardStateObserverManager();
    this.generatedGoldSyncManager = new LeaderboardGeneratedGoldSyncManager();
    this.subscriptionManager = new LeaderboardSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
  }

  setGameplayFacade(gameplayFacade) {
    this.generatedGoldSyncManager.setGameplayFacade(gameplayFacade);
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection, identity);
    this.generatedGoldSyncManager.connect(connection);
  }

  disconnect() {
    this.subscriptionManager.disconnect();
    this.generatedGoldSyncManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }
}

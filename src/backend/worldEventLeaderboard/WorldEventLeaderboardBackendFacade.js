import { WorldEventLeaderboardStateObserverManager } from './managers/WorldEventLeaderboardStateObserverManager.js';
import { WorldEventLeaderboardSubscriptionManager } from './managers/WorldEventLeaderboardSubscriptionManager.js';
import { WorldEventLeaderboardSyncManager } from './managers/WorldEventLeaderboardSyncManager.js';

export class WorldEventLeaderboardBackendFacade {
  static explain =
    'Shares weekly event contribution points so the event leaderboard shows the same ranked users as everyone else sees.';

  constructor() {
    this.stateObserverManager = new WorldEventLeaderboardStateObserverManager();
    this.devSnapshot = null;
    this.subscriptionManager = new WorldEventLeaderboardSubscriptionManager({
      onSnapshot: (snapshot) => {
        if (!this.devSnapshot) {
          this.stateObserverManager.publish(snapshot);
        }
      },
    });
    this.syncManager = new WorldEventLeaderboardSyncManager();
  }

  setGameplayFacade(gameplayFacade) {
    this.subscriptionManager.setGameplayFacade(gameplayFacade);
    this.syncManager.setGameplayFacade(gameplayFacade);
  }

  connect(connection, identity) {
    this.subscriptionManager.connect(connection, identity);
    this.syncManager.connect(connection);
  }

  disconnect() {
    this.syncManager.disconnect();
    this.subscriptionManager.disconnect({ keepGameplay: true });
  }

  getSnapshot() {
    return this.devSnapshot ?? this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  setDevSnapshot(snapshot) {
    this.devSnapshot = snapshot;
    this.stateObserverManager.publish(snapshot);
    return { ok: true };
  }

  clearDevSnapshot() {
    this.devSnapshot = null;
    const snapshot = this.subscriptionManager.getSnapshot();
    this.stateObserverManager.publish(snapshot);
    return { ok: true, snapshot };
  }
}

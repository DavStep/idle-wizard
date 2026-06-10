import { GameConfigStateObserverManager } from './managers/GameConfigStateObserverManager.js';
import { GameConfigSubscriptionManager } from './managers/GameConfigSubscriptionManager.js';

export class GameConfigBackendFacade {
  static explain =
    'Reads server-side balance switches so admin changes can alter live game config without a rebuild.';

  constructor() {
    this.stateObserverManager = new GameConfigStateObserverManager();
    this.subscriptionManager = new GameConfigSubscriptionManager({
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

import { AccountSessionSubscriptionManager } from './managers/AccountSessionSubscriptionManager.js';

export class AccountSessionBackendFacade {
  static explain =
    'Keeps only one open game client active for an account, so two devices cannot save over each other.';

  constructor() {
    this.subscriptionManager = new AccountSessionSubscriptionManager();
  }

  connect(connection, { onInactive } = {}) {
    return this.subscriptionManager.connect(connection, { onInactive });
  }

  disconnect() {
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }
}

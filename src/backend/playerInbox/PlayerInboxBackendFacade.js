import { PlayerInboxActionManager } from './managers/PlayerInboxActionManager.js';
import { PlayerInboxStateObserverManager } from './managers/PlayerInboxStateObserverManager.js';
import { PlayerInboxSubscriptionManager } from './managers/PlayerInboxSubscriptionManager.js';

export class PlayerInboxBackendFacade {
  static explain =
    'Keeps server mail in one place so players can read messages and claim attached rewards without UI code talking to the network.';

  constructor() {
    this.stateObserverManager = new PlayerInboxStateObserverManager();
    this.actionManager = new PlayerInboxActionManager();
    this.subscriptionManager = new PlayerInboxSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.gameplayFacade = null;
    this.processingMailKeys = new Set();
  }

  setGameplayFacade(gameplayFacade) {
    this.gameplayFacade = gameplayFacade;
  }

  connect(connection) {
    this.actionManager.connect(connection);
    this.subscriptionManager.connect(connection);
  }

  disconnect() {
    this.processingMailKeys.clear();
    this.subscriptionManager.disconnect();
    this.actionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  markRead(mailKey) {
    return this.actionManager.markRead(mailKey);
  }

  markVisibleRead() {
    const snapshot = this.getSnapshot();
    const mail = Array.isArray(snapshot?.mail) ? snapshot.mail : [];
    let count = 0;

    for (const row of mail) {
      if (!row?.mailKey || row.read) {
        continue;
      }

      count += 1;
      void this.actionManager.markRead(row.mailKey);
    }

    return { ok: true, count };
  }

  async claimReward(mailKey) {
    const safeMailKey = String(mailKey ?? '').trim();
    if (!safeMailKey || this.processingMailKeys.has(safeMailKey)) {
      return { ok: false, reason: safeMailKey ? 'claim_pending' : 'missing_mail' };
    }

    const mail = this.getSnapshot().mail.find((row) => row.mailKey === safeMailKey);
    if (!mail) {
      return { ok: false, reason: 'mail_not_found' };
    }

    if (!mail.hasReward) {
      return { ok: false, reason: 'empty_reward' };
    }

    if (mail.rewardCollected) {
      return { ok: true, alreadyCollected: true };
    }

    this.processingMailKeys.add(safeMailKey);
    try {
      const grantResult = this.gameplayFacade?.claimInboxReward?.(mail);
      if (!grantResult?.ok) {
        return {
          ok: false,
          reason: grantResult?.reason ?? 'gameplay_unavailable',
        };
      }

      const collectResult = await this.actionManager.collectReward(safeMailKey);
      if (!collectResult?.ok) {
        return {
          ok: true,
          pendingServer: true,
          reason: collectResult?.reason ?? 'collect_failed',
          grant: grantResult,
        };
      }

      return {
        ok: true,
        grant: grantResult,
      };
    } finally {
      this.processingMailKeys.delete(safeMailKey);
    }
  }
}

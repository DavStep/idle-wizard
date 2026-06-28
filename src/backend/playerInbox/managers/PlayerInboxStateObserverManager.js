export const EMPTY_PLAYER_INBOX_SNAPSHOT = {
  connected: false,
  mail: [],
  unreadCount: 0,
  claimableCount: 0,
  hasNotification: false,
};

export class PlayerInboxStateObserverManager {
  constructor() {
    this.listeners = new Set();
    this.lastSnapshot = { ...EMPTY_PLAYER_INBOX_SNAPSHOT };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.lastSnapshot);
    return () => this.listeners.delete(listener);
  }

  publish(snapshot) {
    this.lastSnapshot = snapshot ?? { ...EMPTY_PLAYER_INBOX_SNAPSHOT };

    for (const listener of this.listeners) {
      listener(this.lastSnapshot);
    }
  }

  clear() {
    this.listeners.clear();
    this.lastSnapshot = { ...EMPTY_PLAYER_INBOX_SNAPSHOT };
  }
}

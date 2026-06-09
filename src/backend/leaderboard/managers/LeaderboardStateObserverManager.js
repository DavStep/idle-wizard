export class LeaderboardStateObserverManager {
  constructor() {
    this.listeners = new Set();
    this.lastSnapshot = { topUsers: [] };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.lastSnapshot);
    return () => this.listeners.delete(listener);
  }

  publish(snapshot) {
    this.lastSnapshot = snapshot;

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  clear() {
    this.listeners.clear();
    this.lastSnapshot = { topUsers: [] };
  }
}

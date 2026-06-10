const EMPTY_SNAPSHOT = {
  connected: false,
  prices: [],
};

export class NpcMarketStateObserverManager {
  constructor() {
    this.listeners = new Set();
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.lastSnapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(snapshot) {
    this.lastSnapshot = snapshot;

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  clear() {
    this.listeners.clear();
    this.lastSnapshot = { ...EMPTY_SNAPSHOT };
  }
}

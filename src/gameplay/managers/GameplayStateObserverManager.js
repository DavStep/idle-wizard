export class GameplayStateObserverManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  hasListeners() {
    return this.listeners.size > 0;
  }

  publish(snapshot) {
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  clear() {
    this.listeners.clear();
  }
}

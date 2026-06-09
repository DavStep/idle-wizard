export class GameplayStateObserverManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

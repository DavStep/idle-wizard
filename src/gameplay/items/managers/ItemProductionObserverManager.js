export class ItemProductionObserverManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(production) {
    for (const listener of this.listeners) {
      listener(production);
    }
  }
}

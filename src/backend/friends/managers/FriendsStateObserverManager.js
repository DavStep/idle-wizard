export const EMPTY_FRIENDS_SNAPSHOT = Object.freeze({
  connected: false,
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
});

export class FriendsStateObserverManager {
  constructor() {
    this.snapshot = { ...EMPTY_FRIENDS_SNAPSHOT };
    this.listeners = new Set();
  }

  publish(snapshot) {
    this.snapshot = snapshot ?? { ...EMPTY_FRIENDS_SNAPSHOT };
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
}

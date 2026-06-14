export class GameplayRewardEventManager {
  constructor() {
    this.listeners = new Set();
    this.nextEventId = 1;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event) {
    if (!event?.type) {
      return null;
    }

    const rewardEvent = {
      ...event,
      id: this.nextEventId,
    };
    this.nextEventId += 1;

    for (const listener of this.listeners) {
      listener(rewardEvent);
    }

    return rewardEvent;
  }

  clear() {
    this.listeners.clear();
  }
}

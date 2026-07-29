export class PageActivityScopeManager {
  static explain =
    'Pauses page-owned subscription callbacks while a cached room is hidden, then delivers only the latest data when that room becomes active again.';

  constructor({ active = true } = {}) {
    this.active = active;
    this.subscriptions = new Set();
    this.facades = new WeakMap();
  }

  scope(facade) {
    if (!facade || (typeof facade !== 'object' && typeof facade !== 'function')) {
      return facade;
    }

    const cached = this.facades.get(facade);
    if (cached) {
      return cached;
    }

    const methodCache = new Map();
    const scoped = new Proxy(facade, {
      get: (target, property, receiver) => {
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== 'function') {
          return value;
        }

        if (methodCache.has(property)) {
          return methodCache.get(property);
        }

        const method = String(property).startsWith('subscribe')
          ? (...args) =>
              this.subscribe(target, value, args, {
                replayLatest: property !== 'subscribeRewardEvents',
              })
          : value.bind(target);
        methodCache.set(property, method);
        return method;
      },
    });

    this.facades.set(facade, scoped);
    return scoped;
  }

  subscribe(target, subscribe, args, { replayLatest = true } = {}) {
    const callbackIndex = args.findIndex((argument) => typeof argument === 'function');
    if (callbackIndex < 0) {
      return subscribe.apply(target, args);
    }

    const listener = args[callbackIndex];
    const subscription = {
      listener,
      lastArgs: null,
      replayLatest,
      disposed: false,
      unsubscribe: null,
    };
    const wrappedListener = (...listenerArgs) => {
      subscription.lastArgs = subscription.replayLatest
        ? listenerArgs
        : null;
      if (this.active && !subscription.disposed) {
        listener(...listenerArgs);
      }
    };
    const scopedArgs = [...args];
    scopedArgs[callbackIndex] = wrappedListener;

    this.subscriptions.add(subscription);
    try {
      subscription.unsubscribe = subscribe.apply(target, scopedArgs);
    } catch (error) {
      this.subscriptions.delete(subscription);
      throw error;
    }

    return () => this.unsubscribe(subscription);
  }

  suspend() {
    this.active = false;
  }

  resume() {
    if (this.active) {
      return;
    }

    this.active = true;
    for (const subscription of this.subscriptions) {
      if (
        subscription.replayLatest &&
        !subscription.disposed &&
        subscription.lastArgs
      ) {
        subscription.listener(...subscription.lastArgs);
      }
    }
  }

  unsubscribe(subscription) {
    if (!subscription || subscription.disposed) {
      return;
    }

    subscription.disposed = true;
    this.subscriptions.delete(subscription);
    subscription.unsubscribe?.();
    subscription.unsubscribe = null;
    subscription.lastArgs = null;
  }

  clear() {
    for (const subscription of [...this.subscriptions]) {
      this.unsubscribe(subscription);
    }
    this.facades = new WeakMap();
  }
}

import { NpcMarketStateObserverManager } from './managers/NpcMarketStateObserverManager.js';
import { NpcMarketSubscriptionManager } from './managers/NpcMarketSubscriptionManager.js';
import { NpcMarketTradeManager } from './managers/NpcMarketTradeManager.js';

export class NpcMarketBackendFacade {
  static explain =
    'Shares NPC bazar prices and stock through the server so all players see the same trader market.';

  constructor() {
    this.stateObserverManager = new NpcMarketStateObserverManager();
    this.subscriptionManager = new NpcMarketSubscriptionManager({
      onSnapshot: (snapshot) => this.stateObserverManager.publish(snapshot),
    });
    this.tradeManager = new NpcMarketTradeManager();
    this.connection = null;
    this.priceRetainCount = 0;
    this.pricesActive = false;
  }

  connect(connection) {
    if (this.pricesActive) {
      this.subscriptionManager.disconnect();
      this.pricesActive = false;
    }

    this.connection = connection;
    this.tradeManager.connect(connection);
    this.syncPriceSubscription();
  }

  disconnect() {
    this.connection = null;
    this.pricesActive = false;
    this.tradeManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  retainPrices() {
    this.priceRetainCount += 1;
    this.syncPriceSubscription();

    let released = false;
    return () => {
      if (released) {
        return;
      }

      released = true;
      this.priceRetainCount = Math.max(0, this.priceRetainCount - 1);
      this.syncPriceSubscription();
    };
  }

  retainPublicData() {
    return this.retainPrices();
  }

  syncPriceSubscription() {
    const shouldBeActive = Boolean(this.connection && this.priceRetainCount > 0);

    if (shouldBeActive && !this.pricesActive) {
      this.subscriptionManager.connect(this.connection);
      this.pricesActive = true;
      return;
    }

    if (!shouldBeActive && this.pricesActive) {
      this.subscriptionManager.disconnect();
      this.pricesActive = false;
    }
  }

  getPrice(itemKey) {
    return this.subscriptionManager.getPrice(itemKey);
  }

  getNpcBuyPriceCoin(itemKey) {
    return this.getPrice(itemKey)?.npcBuyPriceCoin ?? null;
  }

  getNpcSellPriceCoin(itemKey) {
    return this.getPrice(itemKey)?.npcSellPriceCoin ?? null;
  }

  getNpcNeed(itemKey) {
    return this.getPrice(itemKey)?.npcNeed ?? null;
  }

  getNpcStock(itemKey) {
    return this.getPrice(itemKey)?.npcStock ?? null;
  }

  sellToNpc({ itemKey, quantity = 1 }) {
    return this.tradeManager.sellToNpc({ itemKey, quantity });
  }

  buyFromNpc({ itemKey, quantity = 1 }) {
    return this.tradeManager.buyFromNpc({ itemKey, quantity });
  }

  resetMarket() {
    return this.tradeManager.resetMarket();
  }
}

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
  }

  connect(connection) {
    this.subscriptionManager.connect(connection);
    this.tradeManager.connect(connection);
    void this.tradeManager.tickMarket();
  }

  disconnect() {
    this.tradeManager.disconnect();
    this.subscriptionManager.disconnect();
  }

  getSnapshot() {
    return this.subscriptionManager.getSnapshot();
  }

  subscribe(listener) {
    return this.stateObserverManager.subscribe(listener);
  }

  getPrice(itemKey) {
    return this.subscriptionManager.getPrice(itemKey);
  }

  getNpcBuyPriceGold(itemKey) {
    return this.getPrice(itemKey)?.npcBuyPriceGold ?? null;
  }

  getNpcSellPriceGold(itemKey) {
    return this.getPrice(itemKey)?.npcSellPriceGold ?? null;
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

  tickMarket() {
    return this.tradeManager.tickMarket();
  }

  resetMarket() {
    return this.tradeManager.resetMarket();
  }
}

export class NpcMarketTradeManager {
  constructor() {
    this.connection = null;
  }

  connect(connection) {
    this.connection = connection;
  }

  disconnect() {
    this.connection = null;
  }

  async sellToNpc({ itemKey, quantity = 1 }) {
    const sellToNpc = this.findReducer('sellToNpc', 'sell_to_npc');

    if (!sellToNpc) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await sellToNpc({
        itemKey,
        quantity,
      });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'sell_failed',
      };
    }
  }

  async buyFromNpc({ itemKey, quantity = 1 }) {
    const buyFromNpc = this.findReducer('buyFromNpc', 'buy_from_npc');

    if (!buyFromNpc) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await buyFromNpc({
        itemKey,
        quantity,
      });

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'buy_failed',
      };
    }
  }

  async resetMarket() {
    const resetNpcMarket = this.findReducer('resetNpcMarket', 'reset_npc_market');

    if (!resetNpcMarket) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await resetNpcMarket({});

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'reset_failed',
      };
    }
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }
}

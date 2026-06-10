export class NpcMarketTradeManager {
  constructor({ tickIntervalMs = 60_000 } = {}) {
    this.connection = null;
    this.tickIntervalMs = tickIntervalMs;
    this.tickIntervalId = null;
  }

  connect(connection) {
    this.connection = connection;
    this.startMarketTicks();
  }

  disconnect() {
    this.stopMarketTicks();
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

  async tickMarket() {
    const tickNpcMarket = this.findReducer('tickNpcMarket', 'tick_npc_market');

    if (!tickNpcMarket) {
      return {
        ok: false,
        reason: 'offline',
      };
    }

    try {
      await tickNpcMarket({});

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        reason: 'tick_failed',
      };
    }
  }

  startMarketTicks() {
    this.stopMarketTicks();
    this.tickIntervalId = globalThis.setInterval(() => {
      void this.tickMarket();
    }, this.tickIntervalMs);
  }

  stopMarketTicks() {
    if (this.tickIntervalId === null) {
      return;
    }

    globalThis.clearInterval(this.tickIntervalId);
    this.tickIntervalId = null;
  }

  findReducer(camelName, snakeName) {
    const reducers = this.connection?.reducers;
    return reducers?.[camelName] ?? reducers?.[snakeName] ?? null;
  }
}

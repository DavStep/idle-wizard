import { describe, expect, it, vi } from 'vitest';

import { NpcMarketSubscriptionManager } from './NpcMarketSubscriptionManager.js';

function createTable(rows) {
  const callbacks = {
    insert: null,
    update: null,
    delete: null,
  };

  return {
    iter: () => rows.values(),
    onInsert: (callback) => {
      callbacks.insert = callback;
    },
    onUpdate: (callback) => {
      callbacks.update = callback;
    },
    onDelete: (callback) => {
      callbacks.delete = callback;
    },
    removeOnInsert: (callback) => {
      if (callbacks.insert === callback) {
        callbacks.insert = null;
      }
    },
    removeOnUpdate: (callback) => {
      if (callbacks.update === callback) {
        callbacks.update = null;
      }
    },
    removeOnDelete: (callback) => {
      if (callbacks.delete === callback) {
        callbacks.delete = null;
      }
    },
    callbacks,
  };
}

function createConnection({ pricesTable, priceHistoryTable = null }) {
  const subscriptions = [];

  return {
    db: {
      npcMarketPrice: pricesTable,
      ...(priceHistoryTable ? { marketPriceHourlySnapshot: priceHistoryTable } : {}),
    },
    subscriptions,
    subscriptionBuilder: () => ({
      onApplied(callback) {
        this.applied = callback;
        return this;
      },
      onError(callback) {
        this.error = callback;
        return this;
      },
      subscribe(query) {
        const subscription = {
          query,
          isEnded: () => false,
          unsubscribe: vi.fn(),
        };
        subscriptions.push(subscription);
        this.applied();
        return subscription;
      },
    }),
  };
}

describe('NpcMarketSubscriptionManager', () => {
  it('publishes NPC market prices by item key', () => {
    const pricesTable = createTable([
      {
        hourKey: '1',
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        basePriceCoin: 1n,
        marketPriceCoin: 3n,
        npcBuyPriceCoin: 2n,
        npcSellPriceCoin: 4n,
        npcStock: 900n,
        targetStock: 1000n,
        npcNeed: 750n,
        targetNeed: 1000n,
        maxNeed: 2000n,
        demandScore: 8n,
        supplyScore: 2n,
      },
    ]);
    const connection = createConnection({ pricesTable });
    const manager = new NpcMarketSubscriptionManager();

    manager.connect(connection);

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      prices: [
        {
          itemKey: 'sageSeed',
          marketPriceCoin: 3,
          npcBuyPriceCoin: 2,
          npcSellPriceCoin: 4,
          npcStock: 900,
          npcNeed: 750,
          targetNeed: 1000,
          maxNeed: 2000,
        },
      ],
    });
    expect(manager.getPrice('sageSeed')).toMatchObject({
      itemLabel: 'sage seed',
      npcBuyPriceCoin: 2,
    });
  });

  it('unsubscribes and clears snapshot on disconnect', () => {
    const pricesTable = createTable([]);
    const connection = createConnection({ pricesTable });
    const manager = new NpcMarketSubscriptionManager();

    manager.connect(connection);
    manager.disconnect();

    expect(connection.subscriptions).toHaveLength(1);
    expect(connection.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(pricesTable.callbacks.insert).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      connected: false,
      prices: [],
    });
  });

  it('does not expose another market tier’s stock or prices', () => {
    const pricesTable = createTable([
      {
        itemKey: 'sageSeed',
        marketId: 'smallTown',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        marketPriceCoin: 2n,
        npcBuyPriceCoin: 1n,
        npcStock: 4n,
      },
      {
        itemKey: 'sageSeed',
        marketId: 'arcaneExchange',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        marketPriceCoin: 9n,
        npcBuyPriceCoin: 6n,
        npcStock: 17n,
      },
    ]);
    const manager = new NpcMarketSubscriptionManager();

    manager.setActiveMarketId('arcaneExchange');
    manager.connect(createConnection({ pricesTable }));

    expect(manager.getSnapshot().prices).toEqual([
      expect.objectContaining({
        itemKey: 'sageSeed',
        marketId: 'arcaneExchange',
        marketPriceCoin: 9,
        npcStock: 17,
      }),
    ]);
  });

  it('does not republish when the market id is unchanged', () => {
    const onSnapshot = vi.fn();
    const manager = new NpcMarketSubscriptionManager({ onSnapshot });

    manager.setActiveMarketId('crossroads');
    manager.setActiveMarketId('crossroads');

    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('adds active-market hourly history to each item price', () => {
    const pricesTable = createTable([
      {
        itemKey: 'sageSeed',
        marketId: 'smallTown',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        marketPriceCoin: 3n,
      },
    ]);
    const priceHistoryTable = createTable([
      {
        hourKey: '1',
        itemKey: 'sageSeed',
        marketId: 'smallTown',
        marketPriceCoin: 2n,
        npcBuyPriceCoin: 1n,
        npcSellPriceCoin: 4n,
        npcNeed: 8n,
        npcStock: 12n,
        updatedAt: { microsSinceUnixEpoch: 3_600_000_000n },
      },
      {
        itemKey: 'sageSeed',
        marketId: 'arcaneExchange',
        marketPriceCoin: 99n,
      },
    ]);
    const manager = new NpcMarketSubscriptionManager();

    manager.connect(createConnection({ pricesTable, priceHistoryTable }));

    expect(manager.getPrice('sageSeed')?.priceHistory).toEqual([
      expect.objectContaining({
        hourKey: '1',
        marketPriceCoin: 2,
        npcNeed: 8,
        npcStock: 12,
        updatedAtMs: 3_600_000,
      }),
    ]);
  });
});

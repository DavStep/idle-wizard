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

function createConnection({ pricesTable }) {
  const subscriptions = [];

  return {
    db: {
      npcMarketPrice: pricesTable,
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
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        basePriceGold: 1n,
        marketPriceGold: 3n,
        npcBuyPriceGold: 2n,
        npcSellPriceGold: 4n,
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
          marketPriceGold: 3,
          npcBuyPriceGold: 2,
          npcSellPriceGold: 4,
          npcStock: 900,
          npcNeed: 750,
          targetNeed: 1000,
          maxNeed: 2000,
        },
      ],
    });
    expect(manager.getPrice('sageSeed')).toMatchObject({
      itemLabel: 'sage seed',
      npcBuyPriceGold: 2,
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
});

import { describe, expect, it, vi } from 'vitest';

import { PlayerShopSubscriptionManager } from './PlayerShopSubscriptionManager.js';

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

function createConnection({
  listingsTable,
  proceedsTable,
  tradeHistoryTable = null,
  failedQueries = [],
}) {
  const subscriptions = [];

  return {
    db: {
      playerShopListing: listingsTable,
      playerShopProceeds: proceedsTable,
      ...(tradeHistoryTable ? { playerShopTrade: tradeHistoryTable } : {}),
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
        if (failedQueries.includes(query)) {
          this.error();
        } else {
          this.applied();
        }
        return subscription;
      },
    }),
  };
}

describe('PlayerShopSubscriptionManager', () => {
  it('publishes other listings, own listings, and proceeds', () => {
    const snapshots = [];
    const listingsTable = createTable([
      {
        listingKey: 'self:1',
        sellerIdentity: 'self',
        username: 'wizard',
        slotNumber: 1,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 0,
        priceGold: 3n,
      },
      {
        listingKey: 'seller:1',
        sellerIdentity: 'seller',
        username: 'Ada',
        slotNumber: 1,
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        itemKind: 'seed',
        quantity: 2,
        priceGold: 4n,
      },
    ]);
    const proceedsTable = createTable([
      {
        sellerIdentity: 'self',
        gold: 7n,
      },
    ]);
    const connection = createConnection({ listingsTable, proceedsTable });
    const manager = new PlayerShopSubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(connection, 'self');

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      proceedsGold: 7,
      listings: [
        {
          listingKey: 'seller:1',
          username: 'Ada',
          itemLabel: 'mint seed',
          quantity: 2,
          priceGold: 4,
        },
      ],
      ownListings: [
        {
          listingKey: 'self:1',
          quantity: 0,
          priceGold: 3,
        },
      ],
      tradeHistory: [],
      ownTradeHistory: [],
    });
    expect(snapshots.at(-1)).toEqual(manager.getSnapshot());
  });

  it('publishes own and global trade history newest first', () => {
    const listingsTable = createTable([]);
    const proceedsTable = createTable([]);
    const tradeHistoryTable = createTable([
      {
        tradeId: 'trade-1',
        buyerIdentity: 'self',
        buyerUsername: 'wizard',
        sellerIdentity: 'seller',
        sellerUsername: 'Ada',
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 1,
        priceGold: 3n,
        totalPriceGold: 3n,
        tradedAt: 100,
      },
      {
        tradeId: 'trade-2',
        buyerIdentity: 'other',
        buyerUsername: 'Merlin',
        sellerIdentity: 'seller',
        sellerUsername: 'Ada',
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        itemKind: 'seed',
        quantity: 2,
        priceGold: 4n,
        totalPriceGold: 8n,
        tradedAt: 200,
      },
    ]);
    const connection = createConnection({ listingsTable, proceedsTable, tradeHistoryTable });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, 'self');

    expect(connection.subscriptions.map((subscription) => subscription.query)).toEqual([
      'SELECT * FROM player_shop_listing',
      'SELECT * FROM player_shop_proceeds',
      'SELECT * FROM player_shop_trade',
    ]);
    expect(manager.getSnapshot().tradeHistory.map((trade) => trade.tradeId)).toEqual([
      'trade-2',
      'trade-1',
    ]);
    expect(manager.getSnapshot().ownTradeHistory).toMatchObject([
      {
        tradeId: 'trade-1',
        buyerUsername: 'wizard',
        sellerUsername: 'Ada',
        itemLabel: 'sage seed',
        totalPriceGold: 3,
      },
    ]);
  });

  it('subscribes public listings and own seller rows with indexes when identity hex is available', () => {
    const identityHex = 'b'.repeat(64);
    const listingsTable = createTable([]);
    const proceedsTable = createTable([]);
    const connection = createConnection({ listingsTable, proceedsTable });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, { toHexString: () => identityHex });

    expect(connection.subscriptions.map((subscription) => subscription.query)).toEqual([
      'SELECT * FROM player_shop_listing WHERE quantity > 0',
      `SELECT * FROM player_shop_listing WHERE "sellerIdentity" = 0x${identityHex}`,
      `SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" = 0x${identityHex}`,
    ]);
  });

  it('keeps listings online when optional trade history query fails', () => {
    const listingsTable = createTable([
      {
        listingKey: 'seller:1',
        sellerIdentity: 'seller',
        username: 'Ada',
        slotNumber: 1,
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        itemKind: 'seed',
        quantity: 2,
        priceGold: 4n,
      },
    ]);
    const proceedsTable = createTable([]);
    const tradeHistoryTable = createTable([]);
    const connection = createConnection({
      listingsTable,
      proceedsTable,
      tradeHistoryTable,
      failedQueries: ['SELECT * FROM player_shop_trade'],
    });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, 'self');

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      listings: [
        {
          listingKey: 'seller:1',
          username: 'Ada',
        },
      ],
      tradeHistory: [],
      ownTradeHistory: [],
    });
    expect(tradeHistoryTable.callbacks.insert).toBeNull();
  });

  it('unsubscribes and clears snapshot on disconnect', () => {
    const listingsTable = createTable([]);
    const proceedsTable = createTable([]);
    const connection = createConnection({ listingsTable, proceedsTable });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, 'self');
    manager.disconnect();

    expect(connection.subscriptions).toHaveLength(2);
    expect(connection.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(connection.subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
    expect(listingsTable.callbacks.insert).toBeNull();
    expect(proceedsTable.callbacks.insert).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      connected: false,
      listings: [],
      ownListings: [],
      tradeHistory: [],
      ownTradeHistory: [],
      proceedsGold: 0,
    });
  });
});

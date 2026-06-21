import { describe, expect, it, vi } from 'vitest';

import { PlayerShopSubscriptionManager } from './PlayerShopSubscriptionManager.js';

const SELF_IDENTITY_HEX = 'b'.repeat(64);
const SELF_IDENTITY = { toHexString: () => SELF_IDENTITY_HEX };

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
  publicListingsTable = null,
  ownListingsTable = null,
  publicRequestsTable = null,
  ownRequestsTable = null,
  proceedsTable,
  ownProceedsTable = null,
  tradeHistoryTable = null,
  tradeHistoryRecentTable = null,
  ownTradeHistoryTable = null,
  failedQueries = [],
}) {
  const subscriptions = [];

  return {
    db: {
      playerShopListing: listingsTable,
      ...(publicListingsTable ? { publicPlayerShopListing: publicListingsTable } : {}),
      ...(ownListingsTable ? { ownPlayerShopListing: ownListingsTable } : {}),
      ...(publicRequestsTable ? { publicPlayerShopRequest: publicRequestsTable } : {}),
      ...(ownRequestsTable ? { ownPlayerShopRequest: ownRequestsTable } : {}),
      playerShopProceeds: proceedsTable,
      ...(ownProceedsTable ? { ownPlayerShopProceeds: ownProceedsTable } : {}),
      ...(tradeHistoryTable ? { playerShopTrade: tradeHistoryTable } : {}),
      ...(tradeHistoryRecentTable ? { playerShopTradeRecent: tradeHistoryRecentTable } : {}),
      ...(ownTradeHistoryTable ? { ownPlayerShopTradeHistory: ownTradeHistoryTable } : {}),
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
        sellerIdentity: SELF_IDENTITY_HEX,
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
        sellerIdentity: SELF_IDENTITY_HEX,
        gold: 7n,
      },
    ]);
    const connection = createConnection({ listingsTable, proceedsTable });
    const manager = new PlayerShopSubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(connection, SELF_IDENTITY);
    manager.setPublicDataActive(true);

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

  it('publishes other requests and own requests', () => {
    const listingsTable = createTable([]);
    const publicRequestsTable = createTable([
      {
        requestKey: 'self:1',
        requesterIdentity: SELF_IDENTITY_HEX,
        username: 'wizard',
        slotNumber: 1,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 1,
        priceGold: 2n,
      },
      {
        requestKey: 'hershel:1',
        requesterIdentity: 'hershel',
        username: 'Hershel',
        slotNumber: 1,
        itemKey: 'mintSeed',
        itemLabel: 'mint seed',
        itemKind: 'seed',
        quantity: 4,
        priceGold: 325n,
        priceScale: 100,
      },
    ]);
    const ownRequestsTable = createTable([
      {
        requestKey: 'self:1',
        requesterIdentity: SELF_IDENTITY_HEX,
        username: 'wizard',
        slotNumber: 1,
        itemKey: 'sageSeed',
        itemLabel: 'sage seed',
        itemKind: 'seed',
        quantity: 1,
        priceGold: 2n,
      },
    ]);
    const proceedsTable = createTable([]);
    const connection = createConnection({
      listingsTable,
      publicRequestsTable,
      ownRequestsTable,
      proceedsTable,
    });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, SELF_IDENTITY);
    manager.setPublicDataActive(true);

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      requests: [
        {
          requestKey: 'hershel:1',
          username: 'Hershel',
          itemLabel: 'mint seed',
          quantity: 4,
          priceGold: 3.25,
        },
      ],
      ownRequests: [
        {
          requestKey: 'self:1',
          username: 'wizard',
          itemLabel: 'sage seed',
          quantity: 1,
          priceGold: 2,
        },
      ],
    });
  });

  it('publishes own and global trade history newest first', () => {
    const listingsTable = createTable([]);
    const proceedsTable = createTable([]);
    const tradeHistoryTable = createTable([
      {
        tradeId: 'trade-1',
        buyerIdentity: SELF_IDENTITY_HEX,
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

    manager.connect(connection, SELF_IDENTITY);
    manager.setPublicDataActive(true);

    expect(connection.subscriptions.map((subscription) => subscription.query)).toEqual([
      `SELECT * FROM player_shop_listing WHERE "sellerIdentity" = 0x${SELF_IDENTITY_HEX}`,
      `SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" = 0x${SELF_IDENTITY_HEX}`,
      'SELECT * FROM player_shop_listing WHERE quantity > 0',
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
    manager.setPublicDataActive(true);

    expect(connection.subscriptions.map((subscription) => subscription.query)).toEqual([
      `SELECT * FROM player_shop_listing WHERE "sellerIdentity" = 0x${identityHex}`,
      `SELECT * FROM player_shop_proceeds WHERE "sellerIdentity" = 0x${identityHex}`,
      'SELECT * FROM player_shop_listing WHERE quantity > 0',
    ]);
  });

  it('subscribes modern player-market views', () => {
    const publicListingsTable = createTable([]);
    const ownListingsTable = createTable([]);
    const publicRequestsTable = createTable([]);
    const ownRequestsTable = createTable([]);
    const proceedsTable = createTable([]);
    const ownProceedsTable = createTable([]);
    const tradeHistoryTable = createTable([]);
    const tradeHistoryRecentTable = createTable([]);
    const ownTradeHistoryTable = createTable([]);
    const connection = createConnection({
      listingsTable: createTable([]),
      publicListingsTable,
      ownListingsTable,
      publicRequestsTable,
      ownRequestsTable,
      proceedsTable,
      ownProceedsTable,
      tradeHistoryTable,
      tradeHistoryRecentTable,
      ownTradeHistoryTable,
    });
    const manager = new PlayerShopSubscriptionManager();

    manager.connect(connection, SELF_IDENTITY);
    manager.setPublicDataActive(true);

    expect(connection.subscriptions.map((subscription) => subscription.query)).toEqual([
      'SELECT * FROM own_player_shop_listing',
      'SELECT * FROM own_player_shop_request',
      'SELECT * FROM own_player_shop_proceeds',
      'SELECT * FROM public_player_shop_listing',
      'SELECT * FROM public_player_shop_request',
      'SELECT * FROM player_shop_trade_recent',
      'SELECT * FROM own_player_shop_trade_history',
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

    manager.connect(connection, SELF_IDENTITY);
    manager.setPublicDataActive(true);

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

    manager.connect(connection, SELF_IDENTITY);
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
      requests: [],
      ownRequests: [],
      tradeHistory: [],
      ownTradeHistory: [],
      proceedsGold: 0,
    });
  });
});

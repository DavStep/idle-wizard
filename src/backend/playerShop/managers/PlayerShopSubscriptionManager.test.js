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

function createConnection({ listingsTable, proceedsTable }) {
  const subscriptions = [];

  return {
    db: {
      playerShopListing: listingsTable,
      playerShopProceeds: proceedsTable,
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
        itemLabel: 'Sage Seed',
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
        itemLabel: 'Mint Seed',
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
          itemLabel: 'Mint Seed',
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
    });
    expect(snapshots.at(-1)).toEqual(manager.getSnapshot());
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
      proceedsGold: 0,
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { PotionDiscoverySubscriptionManager } from './PotionDiscoverySubscriptionManager.js';

function createTimestamp(ms) {
  return {
    toMillis: () => BigInt(ms),
  };
}

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

function createConnection(table) {
  const subscription = {
    isEnded: () => false,
    unsubscribe: vi.fn(),
  };

  return {
    db: {
      potionRecipeDiscovery: table,
    },
    subscription,
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
        this.query = query;
        this.applied();
        return subscription;
      },
    }),
  };
}

describe('PotionDiscoverySubscriptionManager', () => {
  it('publishes discovered potion recipes sorted oldest to newest', () => {
    const snapshots = [];
    const table = createTable([
      {
        potionKey: 'silverleafQuiet',
        potionLabel: 'Silverleaf Quiet',
        discoveredByIdentity: 'identity-b',
        username: 'Mira',
        discoveredAt: createTimestamp(2_000),
      },
      {
        potionKey: 'ashenMemory',
        potionLabel: 'Ashen Memory',
        discoveredByIdentity: 'identity-a',
        username: 'Ada',
        discoveredAt: createTimestamp(1_000),
      },
    ]);
    const manager = new PotionDiscoverySubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(createConnection(table));

    expect(manager.getSnapshot()).toEqual({
      connected: true,
      discoveries: [
        {
          potionKey: 'ashenMemory',
          potionLabel: 'Ashen Memory',
          discoveredByIdentity: 'identity-a',
          username: 'Ada',
          discoveredAtMs: 1_000,
        },
        {
          potionKey: 'silverleafQuiet',
          potionLabel: 'Silverleaf Quiet',
          discoveredByIdentity: 'identity-b',
          username: 'Mira',
          discoveredAtMs: 2_000,
        },
      ],
    });
    expect(manager.hasDiscoveredPotion('ashenMemory')).toBe(true);
    expect(manager.getDiscovery('silverleafQuiet')).toMatchObject({
      username: 'Mira',
    });
    expect(snapshots.at(-1)).toEqual(manager.getSnapshot());
  });

  it('unsubscribes and clears snapshot on disconnect', () => {
    const table = createTable([]);
    const connection = createConnection(table);
    const manager = new PotionDiscoverySubscriptionManager();

    manager.connect(connection);
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      connected: false,
      discoveries: [],
    });
  });
});

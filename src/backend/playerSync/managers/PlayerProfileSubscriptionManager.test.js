import { describe, expect, it, vi } from 'vitest';

import { PlayerProfileSubscriptionManager } from './PlayerProfileSubscriptionManager.js';

function createPlayerTable(rows) {
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
      player: table,
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

describe('PlayerProfileSubscriptionManager', () => {
  it('publishes the connected identity player profile', () => {
    const profiles = [];
    const table = createPlayerTable([
      { identity: 'other', username: 'Other' },
      { identity: 'mine', username: 'Server Mage' },
    ]);
    const manager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => profiles.push(profile),
    });

    manager.connect(createConnection(table), 'mine');

    expect(profiles.at(-1)).toEqual({ username: 'Server Mage' });
  });

  it('matches SpacetimeDB identity objects by hex string', () => {
    const profiles = [];
    const table = createPlayerTable([
      {
        identity: { toHexString: () => 'abc123' },
        username: 'Hex Mage',
      },
    ]);
    const manager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => profiles.push(profile),
    });

    manager.connect(createConnection(table), { toHexString: () => 'abc123' });

    expect(profiles.at(-1)).toEqual({ username: 'Hex Mage' });
  });

  it('publishes the updated row from table callbacks even when the table cache is stale', () => {
    const profiles = [];
    const table = createPlayerTable([{ identity: 'mine', username: 'wizard' }]);
    const manager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => profiles.push(profile),
    });

    manager.connect(createConnection(table), 'mine');
    table.callbacks.update(
      {},
      { identity: 'mine', username: 'wizard' },
      { identity: 'mine', username: 'MobileDav' },
    );

    expect(profiles.at(-1)).toEqual({ username: 'MobileDav' });
  });

  it('unsubscribes and removes table callbacks on disconnect', () => {
    const table = createPlayerTable([{ identity: 'mine', username: 'Mage' }]);
    const connection = createConnection(table);
    const manager = new PlayerProfileSubscriptionManager();

    manager.connect(connection, 'mine');
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
  });
});

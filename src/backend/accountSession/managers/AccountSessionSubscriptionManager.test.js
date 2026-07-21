import { describe, expect, it, vi } from 'vitest';

import { AccountSessionSubscriptionManager } from './AccountSessionSubscriptionManager.js';

function createSessionTable(rows) {
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

function createConnection(table, connectionId = 'conn-1') {
  const subscription = {
    isEnded: () => false,
    unsubscribe: vi.fn(),
  };
  const builder = {
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
  };

  return {
    connectionId,
    db: {
      own_player_session: table,
    },
    builder,
    subscription,
    subscriptionBuilder: () => builder,
  };
}

describe('AccountSessionSubscriptionManager', () => {
  it('keeps the current connection active when the session row matches', () => {
    const table = createSessionTable([
      {
        activeConnectionId: 'conn-1',
        updatedAt: { microsSinceUnixEpoch: 12_000n },
      },
    ]);
    const connection = createConnection(table);
    const onInactive = vi.fn();
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection, { onInactive });

    expect(connection.builder.query).toBe('SELECT * FROM own_player_session');
    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      active: true,
      activeConnectionId: 'conn-1',
      ownConnectionId: 'conn-1',
      updatedAtMs: 12,
    });
    expect(onInactive).not.toHaveBeenCalled();
  });

  it('reports inactive once when another connection becomes active', () => {
    const row = {
      activeConnectionId: 'conn-1',
      updatedAt: { microsSinceUnixEpoch: 12_000n },
    };
    const table = createSessionTable([row]);
    const connection = createConnection(table);
    const onInactive = vi.fn();
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection, { onInactive });

    row.activeConnectionId = 'conn-2';
    row.updatedAt = { microsSinceUnixEpoch: 20_000n };
    table.callbacks.update();
    table.callbacks.update();

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      active: false,
      activeConnectionId: 'conn-2',
      ownConnectionId: 'conn-1',
      updatedAtMs: 20,
    });
    expect(onInactive).toHaveBeenCalledTimes(1);
    expect(onInactive).toHaveBeenCalledWith({ reason: 'account_in_use' });
  });

  it('uses the updated callback row when the table iterator is still stale', () => {
    const staleRow = {
      activeConnectionId: 'conn-1',
      updatedAt: { microsSinceUnixEpoch: 12_000n },
    };
    const table = createSessionTable([staleRow]);
    const connection = createConnection(table);
    const onInactive = vi.fn();
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection, { onInactive });
    table.callbacks.update(null, staleRow, {
      activeConnectionId: 'conn-2',
      updatedAt: { microsSinceUnixEpoch: 20_000n },
    });

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      active: false,
      activeConnectionId: 'conn-2',
      updatedAtMs: 20,
    });
    expect(onInactive).toHaveBeenCalledTimes(1);
  });

  it('fails closed once when the own-session subscription has no row', () => {
    const table = createSessionTable([]);
    const connection = createConnection(table);
    const onInactive = vi.fn();
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection, { onInactive });

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      active: false,
      activeConnectionId: '',
      ownConnectionId: 'conn-1',
      updatedAtMs: 0,
    });

    table.callbacks.delete();
    connection.builder.error();

    expect(manager.getSnapshot()).toMatchObject({
      connected: false,
      active: false,
      activeConnectionId: '',
      ownConnectionId: 'conn-1',
      updatedAtMs: 0,
    });
    expect(onInactive).toHaveBeenCalledTimes(1);
    expect(onInactive).toHaveBeenCalledWith({ reason: 'account_session_missing' });
  });

  it('fails closed once when an active own-session subscription errors', () => {
    const table = createSessionTable([{ activeConnectionId: 'conn-1' }]);
    const connection = createConnection(table);
    const onInactive = vi.fn();
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection, { onInactive });
    connection.builder.error();
    connection.builder.error();

    expect(manager.getSnapshot()).toMatchObject({
      connected: false,
      active: false,
      activeConnectionId: '',
      ownConnectionId: 'conn-1',
      updatedAtMs: 0,
    });
    expect(onInactive).toHaveBeenCalledTimes(1);
    expect(onInactive).toHaveBeenCalledWith({ reason: 'account_session_error' });
  });

  it('cleans up a synchronously applied missing-row subscription after inactive teardown', () => {
    const table = createSessionTable([]);
    const connection = createConnection(table);
    const manager = new AccountSessionSubscriptionManager();
    const onInactive = vi.fn(() => manager.disconnect());

    expect(manager.connect(connection, { onInactive })).toBe(false);

    expect(onInactive).toHaveBeenCalledTimes(1);
    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(manager.subscription).toBeNull();
    expect(manager.getSnapshot()).toMatchObject({
      connected: false,
      active: false,
    });
  });

  it('unsubscribes from the own-session view on disconnect', () => {
    const table = createSessionTable([{ activeConnectionId: 'conn-1' }]);
    const connection = createConnection(table);
    const manager = new AccountSessionSubscriptionManager();

    manager.connect(connection);
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.update).toBeNull();
    expect(manager.getSnapshot()).toMatchObject({
      connected: false,
      active: false,
    });
  });
});

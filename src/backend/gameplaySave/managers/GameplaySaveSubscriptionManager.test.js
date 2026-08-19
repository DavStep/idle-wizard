import { describe, expect, it, vi } from 'vitest';

import { GameplaySaveSubscriptionManager } from './GameplaySaveSubscriptionManager.js';

function createSaveTable(rows) {
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

function createConnection(table, { autoApply = true } = {}) {
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
      if (autoApply) {
        this.applied();
      }
      return subscription;
    },
  };

  return {
    db: {
      own_player_gameplay_save: table,
    },
    builder,
    subscription,
    subscriptionBuilder: () => builder,
  };
}

describe('GameplaySaveSubscriptionManager', () => {
  it('keeps publishing own gameplay-save changes after hydration', () => {
    const save = { version: 2, coin: { current: 12 } };
    const row = {
      saveJson: JSON.stringify(save),
      updatedAt: { microsSinceUnixEpoch: 12_000n },
    };
    const table = createSaveTable([row]);
    const connection = createConnection(table);
    const ready = vi.fn();
    const onSnapshot = vi.fn();
    const manager = new GameplaySaveSubscriptionManager({ onSnapshot });

    manager.connect(connection, 'mine', { onReady: ready });

    expect(connection.builder.query).toBe('SELECT * FROM own_player_gameplay_save');
    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      save,
      updatedAtMs: 12,
    });
    expect(ready).toHaveBeenCalledWith({
      ok: true,
      save,
      updatedAtMs: 12,
    });
    expect(connection.subscription.unsubscribe).not.toHaveBeenCalled();
    expect(table.callbacks.insert).toEqual(expect.any(Function));
    expect(table.callbacks.update).toEqual(expect.any(Function));
    expect(table.callbacks.delete).toEqual(expect.any(Function));

    const acceptedSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 2,
      coin: { current: 18 },
    };
    const acceptedRow = {
      saveJson: JSON.stringify(acceptedSave),
      updatedAt: { microsSinceUnixEpoch: 20_000n },
    };
    table.callbacks.update({}, row, acceptedRow);

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      save: acceptedSave,
      updatedAtMs: 20,
    });
    expect(onSnapshot).toHaveBeenLastCalledWith({
      connected: true,
      save: acceptedSave,
      updatedAtMs: 20,
    });
  });

  it('publishes the update callback row when table iteration is still stale', () => {
    const staleSave = {
      version: 2,
      clientSaveSessionId: 'previous-session',
      clientSaveSequence: 1,
    };
    const staleRow = {
      saveJson: JSON.stringify(staleSave),
      updatedAt: { microsSinceUnixEpoch: 12_000n },
    };
    const acceptedSave = {
      version: 3,
      clientSaveSessionId: 'client-session',
      clientSaveSequence: 2,
    };
    const acceptedRow = {
      saveJson: JSON.stringify(acceptedSave),
      updatedAt: { microsSinceUnixEpoch: 20_000n },
    };
    const table = createSaveTable([staleRow]);
    const connection = createConnection(table);
    const onSnapshot = vi.fn();
    const manager = new GameplaySaveSubscriptionManager({ onSnapshot });

    manager.connect(connection, 'mine');
    table.callbacks.update({}, staleRow, acceptedRow);

    expect(table.iter().next().value).toBe(staleRow);
    expect(manager.getSnapshot()).toEqual({
      connected: true,
      save: acceptedSave,
      updatedAtMs: 20,
    });
    expect(onSnapshot).toHaveBeenLastCalledWith({
      connected: true,
      save: acceptedSave,
      updatedAtMs: 20,
    });
  });

  it('reports missing own-save view as not ready', () => {
    const ready = vi.fn();
    const manager = new GameplaySaveSubscriptionManager();

    expect(manager.connect({ db: {} }, 'mine', { onReady: ready })).toBe(false);
    expect(ready).toHaveBeenCalledWith({
      ok: false,
      reason: 'gameplay_save_missing',
    });
  });

  it('reports stalled initial hydration as a timeout exactly once', () => {
    let timeoutCallback = null;
    const setTimeoutFn = vi.fn((callback) => {
      timeoutCallback = callback;
      return 7;
    });
    const clearTimeoutFn = vi.fn();
    const table = createSaveTable([]);
    const connection = createConnection(table, { autoApply: false });
    const ready = vi.fn();
    const manager = new GameplaySaveSubscriptionManager({
      readyTimeoutMs: 1_000,
      setTimeoutFn,
      clearTimeoutFn,
    });

    manager.connect(connection, 'mine', { onReady: ready });

    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1_000);
    expect(ready).not.toHaveBeenCalled();

    timeoutCallback();
    connection.builder.applied();

    expect(ready).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledWith({
      ok: false,
      reason: 'gameplay_save_timeout',
    });
    expect(clearTimeoutFn).not.toHaveBeenCalled();
  });

  it('clears the hydration timeout when the subscription applies', () => {
    const setTimeoutFn = vi.fn(() => 9);
    const clearTimeoutFn = vi.fn();
    const table = createSaveTable([]);
    const connection = createConnection(table);
    const manager = new GameplaySaveSubscriptionManager({
      readyTimeoutMs: 1_000,
      setTimeoutFn,
      clearTimeoutFn,
    });

    manager.connect(connection, 'mine');

    expect(clearTimeoutFn).toHaveBeenCalledWith(9);
  });

  it('clears the hydration timeout on subscription error and disconnect', () => {
    const timeoutIds = [11, 12];
    const setTimeoutFn = vi.fn(() => timeoutIds.shift());
    const clearTimeoutFn = vi.fn();
    const table = createSaveTable([]);
    const connection = createConnection(table, { autoApply: false });
    const manager = new GameplaySaveSubscriptionManager({
      readyTimeoutMs: 1_000,
      setTimeoutFn,
      clearTimeoutFn,
    });

    manager.connect(connection, 'mine');
    connection.builder.error();
    manager.connect(connection, 'mine');
    manager.disconnect();

    expect(clearTimeoutFn.mock.calls).toEqual([[11], [12]]);
  });

  it('cleans up when synchronous ready work disconnects hydration', () => {
    const table = createSaveTable([]);
    const connection = createConnection(table);
    const manager = new GameplaySaveSubscriptionManager();

    expect(
      manager.connect(connection, 'mine', {
        onReady: () => manager.disconnect(),
      }),
    ).toBe(false);

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(manager.subscription).toBeNull();
  });

  it('unsubscribes from later save acknowledgements on disconnect', () => {
    const table = createSaveTable([]);
    const connection = createConnection(table);
    const manager = new GameplaySaveSubscriptionManager();

    manager.connect(connection, 'mine');
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
  });
});

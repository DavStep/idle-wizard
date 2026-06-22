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

function createConnection(table) {
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
    db: {
      own_player_gameplay_save: table,
    },
    builder,
    subscription,
    subscriptionBuilder: () => builder,
  };
}

describe('GameplaySaveSubscriptionManager', () => {
  it('publishes own gameplay save from the own-save view', () => {
    const save = { version: 2, coin: { current: 12 } };
    const table = createSaveTable([
      {
        saveJson: JSON.stringify(save),
        updatedAt: { microsSinceUnixEpoch: 12_000n },
      },
    ]);
    const connection = createConnection(table);
    const ready = vi.fn();
    const manager = new GameplaySaveSubscriptionManager();

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
    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
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
});

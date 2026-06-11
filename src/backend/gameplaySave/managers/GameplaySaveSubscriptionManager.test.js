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

  return {
    db: {
      playerGameplaySave: table,
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

describe('GameplaySaveSubscriptionManager', () => {
  it('publishes own gameplay save when subscription is ready', () => {
    const save = { version: 2, gold: { current: 12 } };
    const table = createSaveTable([
      { identity: 'other', saveJson: JSON.stringify({ version: 2 }) },
      { identity: 'mine', saveJson: JSON.stringify(save) },
    ]);
    const ready = vi.fn();
    const manager = new GameplaySaveSubscriptionManager();

    manager.connect(createConnection(table), 'mine', { onReady: ready });

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      save,
    });
    expect(ready).toHaveBeenCalledWith({
      ok: true,
      save,
      updatedAtMs: 0,
    });
  });

  it('reports missing save table as not ready', () => {
    const ready = vi.fn();
    const manager = new GameplaySaveSubscriptionManager();

    expect(manager.connect({ db: {} }, 'mine', { onReady: ready })).toBe(false);
    expect(ready).toHaveBeenCalledWith({
      ok: false,
      reason: 'gameplay_save_missing',
    });
  });
});

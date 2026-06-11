import { describe, expect, it, vi } from 'vitest';

import { WorldChatSubscriptionManager } from './WorldChatSubscriptionManager.js';

function createTimestamp(ms) {
  return {
    toMillis: () => BigInt(ms),
  };
}

function createWorldChatTable(rows) {
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
      worldChat: table,
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

describe('WorldChatSubscriptionManager', () => {
  it('publishes world chat messages sorted oldest to newest', () => {
    const snapshots = [];
    const table = createWorldChatTable([
      {
        messageId: 'b',
        senderIdentity: 'sender-b',
        username: 'Mira',
        playerLevel: 4,
        body: 'second',
        sentAt: createTimestamp(2_000),
      },
      {
        messageId: 'a',
        senderIdentity: 'sender-a',
        username: 'Ada',
        playerLevel: 2,
        body: 'first',
        sentAt: createTimestamp(1_000),
      },
    ]);
    const manager = new WorldChatSubscriptionManager({
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    manager.connect(createConnection(table));

    expect(manager.getSnapshot()).toEqual({
      connected: true,
      messages: [
        {
          id: 'a',
          senderIdentity: 'sender-a',
          username: 'Ada',
          playerLevel: 2,
          allianceTag: '',
          body: 'first',
          sentAtMs: 1_000,
        },
        {
          id: 'b',
          senderIdentity: 'sender-b',
          username: 'Mira',
          playerLevel: 4,
          allianceTag: '',
          body: 'second',
          sentAtMs: 2_000,
        },
      ],
    });
    expect(snapshots.at(-1)).toEqual(manager.getSnapshot());
  });

  it('falls back to level 1 for older player messages without a level', () => {
    const table = createWorldChatTable([
      {
        messageId: 'a',
        senderIdentity: 'sender-a',
        username: 'Ada',
        body: 'first',
        sentAt: createTimestamp(1_000),
      },
    ]);
    const manager = new WorldChatSubscriptionManager();

    manager.connect(createConnection(table));

    expect(manager.getSnapshot().messages[0]).toMatchObject({
      username: 'Ada',
      playerLevel: 1,
    });
  });

  it('unsubscribes and clears snapshot on disconnect', () => {
    const table = createWorldChatTable([]);
    const connection = createConnection(table);
    const manager = new WorldChatSubscriptionManager();

    manager.connect(connection);
    manager.disconnect();

    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      connected: false,
      messages: [],
    });
  });
});

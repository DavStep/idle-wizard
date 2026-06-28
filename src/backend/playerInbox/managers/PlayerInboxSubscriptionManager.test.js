import { describe, expect, it, vi } from 'vitest';

import { PlayerInboxSubscriptionManager } from './PlayerInboxSubscriptionManager.js';

function createTimestamp(ms) {
  return {
    microsSinceUnixEpoch: BigInt(ms) * 1000n,
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
      ownPlayerInboxMail: table,
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
        subscription.query = query;
        this.applied();
        return subscription;
      },
    }),
  };
}

describe('PlayerInboxSubscriptionManager', () => {
  it('maps own inbox rows newest first with normalized rewards', () => {
    const table = createTable([
      {
        mailKey: 'news:old:id',
        sourceType: 'news',
        sourceKey: 'old',
        senderLabel: 'news',
        title: 'old news',
        body: 'body',
        createdAt: createTimestamp(1_000),
        read: true,
        rewardCollected: true,
        coinReward: 0n,
        crystalReward: 0,
        rubyReward: 0,
        emeraldReward: 0,
        itemRewardsJson: '[]',
      },
      {
        mailKey: 'admin:gift:id',
        sourceType: 'admin',
        sourceKey: 'gift',
        senderLabel: 'admin',
        title: 'gift',
        body: 'take it',
        createdAt: createTimestamp(2_000),
        read: false,
        rewardCollected: false,
        rewardText: '5 coin, 2 crystal, 3 sageSeed',
        coinReward: 5n,
        crystalReward: 2,
        rubyReward: 0,
        emeraldReward: 1,
        itemRewardsJson: JSON.stringify([{ itemKey: 'sageSeed', quantity: 3 }]),
      },
    ]);
    const manager = new PlayerInboxSubscriptionManager();

    manager.connect(createConnection(table));

    expect(manager.getSnapshot()).toEqual({
      connected: true,
      unreadCount: 1,
      claimableCount: 1,
      hasNotification: true,
      mail: [
        {
          mailKey: 'admin:gift:id',
          sourceType: 'admin',
          sourceKey: 'gift',
          senderLabel: 'admin',
          title: 'gift',
          body: 'take it',
          createdAtMs: 2_000,
          read: false,
          hasReward: true,
          rewardCollected: false,
          rewardText: '5 coin, 2 crystal, 3 sageSeed',
          reward: {
            coin: 5,
            crystal: 2,
            ruby: 0,
            emerald: 1,
            items: [{ itemKey: 'sageSeed', quantity: 3 }],
          },
        },
        {
          mailKey: 'news:old:id',
          sourceType: 'news',
          sourceKey: 'old',
          senderLabel: 'news',
          title: 'old news',
          body: 'body',
          createdAtMs: 1_000,
          read: true,
          hasReward: false,
          rewardCollected: true,
          rewardText: '',
          reward: {
            coin: 0,
            crystal: 0,
            ruby: 0,
            emerald: 0,
            items: [],
          },
        },
      ],
    });
  });

  it('subscribes to own player inbox mail and clears on disconnect', () => {
    const table = createTable([]);
    const connection = createConnection(table);
    const manager = new PlayerInboxSubscriptionManager();

    manager.connect(connection);
    expect(connection.subscription.query).toBe('SELECT * FROM own_player_inbox_mail');

    manager.disconnect();
    expect(connection.subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(table.callbacks.insert).toBeNull();
    expect(manager.getSnapshot()).toEqual({
      connected: false,
      mail: [],
      unreadCount: 0,
      claimableCount: 0,
      hasNotification: false,
    });
  });
});

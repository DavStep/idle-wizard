import { describe, expect, it, vi } from 'vitest';

import { GameConfigSubscriptionManager } from './GameConfigSubscriptionManager.js';

function createTable(rows) {
  return {
    iter: () => rows.values(),
  };
}

function createConnection({ researchTable, applySynchronously = false }) {
  const builders = [];
  const subscriptions = [];

  return {
    db: {
      researchConfigSnapshot: researchTable,
    },
    builders,
    subscriptions,
    subscriptionBuilder: () => {
      const builder = {
        applied: null,
        error: null,
        onApplied(callback) {
          this.applied = callback;
          return this;
        },
        onError(callback) {
          this.error = callback;
          return this;
        },
        subscribe(query) {
          const unsubscribe = vi.fn(() => {
            if (unsubscribe.mock.calls.length > 1) {
              throw new Error('Unsubscribe has already been called');
            }
          });
          const subscription = {
            query,
            isEnded: () => false,
            unsubscribe,
          };

          builders.push(builder);
          subscriptions.push(subscription);

          if (applySynchronously) {
            this.applied?.();
          }

          return subscription;
        },
      };

      return builder;
    },
  };
}

describe('GameConfigSubscriptionManager', () => {
  it('unsubscribes bootstrap subscriptions only once when applied repeats', () => {
    const table = createTable([
      {
        researchId: 'sage',
        label: 'sage',
        groupId: 'seed',
        defaultCostCoin: 1,
        costCoin: 1,
        durationSeconds: 1,
        enabled: true,
      },
    ]);
    const connection = createConnection({ researchTable: table });
    const manager = new GameConfigSubscriptionManager();

    manager.connect(connection);
    connection.builders[0].applied();
    connection.builders[0].applied();
    manager.disconnect();

    expect(connection.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes bootstrap subscriptions when applied during subscribe', () => {
    const table = createTable([
      {
        researchId: 'sage',
        label: 'sage',
        groupId: 'seed',
        defaultCostCoin: 1,
        costCoin: 1,
        durationSeconds: 1,
        enabled: true,
      },
    ]);
    const connection = createConnection({
      researchTable: table,
      applySynchronously: true,
    });
    const manager = new GameConfigSubscriptionManager();

    manager.connect(connection);

    expect(connection.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
  });
});

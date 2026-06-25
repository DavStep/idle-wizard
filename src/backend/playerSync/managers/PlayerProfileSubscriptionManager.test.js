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

function createConnection(table, { hasOwnProfile = true } = {}) {
  const subscription = {
    isEnded: () => false,
    unsubscribe: vi.fn(),
  };
  const db = hasOwnProfile ? { own_player_profile: table } : { player: table };

  return {
    db,
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

describe('PlayerProfileSubscriptionManager', () => {
  it('publishes the connected identity player profile', () => {
    const profiles = [];
    const table = createPlayerTable([
      {
        identity: 'mine',
        username: 'Server Mage',
        theme: 'black',
        font: 'comic-sans-mono',
        colorMode: 'resources',
        character: 'mira',
        usernamePromptSeen: true,
      },
    ]);
    const manager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => profiles.push(profile),
    });

    manager.connect(createConnection(table), 'mine');

    expect(profiles.at(-1)).toEqual({
      username: 'Server Mage',
      theme: 'black',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'mira',
      usernamePromptSeen: true,
    });
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

    expect(profiles.at(-1)).toEqual({
      username: 'Hex Mage',
      theme: 'white',
      font: 'lexend',
      colorMode: 'resources',
      character: 'elara',
      usernamePromptSeen: false,
    });
  });

  it('subscribes to the sender-scoped player profile view', () => {
    const identityHex = 'a'.repeat(64);
    const table = createPlayerTable([
      {
        identity: { toHexString: () => identityHex },
        username: 'Hex Mage',
      },
    ]);
    const connection = createConnection(table);
    const manager = new PlayerProfileSubscriptionManager();

    manager.connect(connection, { toHexString: () => identityHex });

    expect(connection.subscription.query).toBe('SELECT * FROM own_player_profile');
  });

  it('falls back to an indexed player row query for old modules without the profile view', () => {
    const identityHex = 'b'.repeat(64);
    const table = createPlayerTable([
      {
        identity: { toHexString: () => identityHex },
        username: 'Hex Mage',
      },
    ]);
    const connection = createConnection(table, { hasOwnProfile: false });
    const manager = new PlayerProfileSubscriptionManager();

    manager.connect(connection, { toHexString: () => identityHex });

    expect(connection.subscription.query).toBe(
      `SELECT * FROM player WHERE identity = 0x${identityHex}`,
    );
  });

  it('does not fall back to a full player-table subscription without a SQL identity', () => {
    const profiles = [];
    const table = createPlayerTable([{ identity: 'mine', username: 'Mage' }]);
    const connection = createConnection(table, { hasOwnProfile: false });
    const manager = new PlayerProfileSubscriptionManager({
      onProfile: (profile) => profiles.push(profile),
    });

    manager.connect(connection, 'mine');

    expect(connection.subscription.query).toBeUndefined();
    expect(profiles.at(-1)).toBeNull();
    expect(table.callbacks.insert).toBeNull();
    expect(table.callbacks.update).toBeNull();
    expect(table.callbacks.delete).toBeNull();
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
      {
        identity: 'mine',
        username: 'MobileDav',
        theme: 'black',
        font: 'comic-sans-mono',
        color_mode: 'resources',
        character: 'rowan',
        username_prompt_seen: true,
      },
    );

    expect(profiles.at(-1)).toEqual({
      username: 'MobileDav',
      theme: 'black',
      font: 'comic-sans-mono',
      colorMode: 'resources',
      character: 'rowan',
      usernamePromptSeen: true,
    });
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

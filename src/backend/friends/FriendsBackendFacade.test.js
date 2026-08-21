import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { FriendsBackendFacade } from './FriendsBackendFacade.js';
import { DirectMessageSubscriptionManager } from './managers/DirectMessageSubscriptionManager.js';

describe('FriendsBackendFacade', () => {
  it.each([
    'own_friendship_table.ts',
    'own_incoming_friend_request_table.ts',
    'own_outgoing_friend_request_table.ts',
  ])('keeps relationship profile data in the generated %s contract', (bindingFile) => {
    const source = readFileSync(
      new URL(`../spacetimedb/module_bindings/${bindingFile}`, import.meta.url),
      'utf8',
    );

    expect(source).toContain('allianceTag: __t.string()');
    expect(source).toContain('allianceTagColor: __t.string()');
    expect(source).toContain('prestigeCount: __t.u32()');
    expect(source).toContain('totalProducedGold: __t.u64()');
  });

  it('maps relationship rows and routes every server-authoritative action', async () => {
    const reducers = {
      sendFriendRequest: vi.fn().mockResolvedValue(undefined),
      acceptFriendRequest: vi.fn().mockResolvedValue(undefined),
      rejectFriendRequest: vi.fn().mockResolvedValue(undefined),
      unfriendPlayer: vi.fn().mockResolvedValue(undefined),
      sendDirectMessage: vi.fn().mockResolvedValue(undefined),
    };
    const connection = createConnection({ reducers });
    const facade = new FriendsBackendFacade();

    facade.connect(connection, identity('self'));
    connection.db.ownFriendship.rows.push(
      playerRow({ friendIdentity: identity('friend'), friendshipKey: 'friendship' }),
    );
    connection.db.ownIncomingFriendRequest.rows.push(
      playerRow({ playerIdentity: identity('incoming'), requestKey: 'incoming' }),
    );
    connection.db.ownOutgoingFriendRequest.rows.push(
      playerRow({ playerIdentity: identity('outgoing'), requestKey: 'outgoing' }),
    );
    connection.db.ownFriendship.emitInsert();

    expect(facade.getSnapshot().friends[0]).toMatchObject({
      identity: 'friend',
      allianceTag: 'MOSS',
      allianceTagColor: 'green',
      prestigeCount: 2,
      totalProducedCoin: 123_456,
    });
    expect(facade.getRelationship('friend')).toBe('friend');
    expect(facade.getRelationship('incoming')).toBe('incoming');
    expect(facade.getRelationship('outgoing')).toBe('outgoing');
    expect(facade.getRelationship('stranger')).toBe('stranger');

    await facade.sendRequest('stranger');
    await facade.acceptRequest('incoming');
    await facade.rejectRequest('incoming');
    await facade.unfriend('friend');
    await facade.sendDirectMessage('friend', '  hello   there  ');

    expect(reducers.sendFriendRequest).toHaveBeenCalledWith({ recipientIdentityHex: 'stranger' });
    expect(reducers.acceptFriendRequest).toHaveBeenCalledWith({ senderIdentityHex: 'incoming' });
    expect(reducers.rejectFriendRequest).toHaveBeenCalledWith({ senderIdentityHex: 'incoming' });
    expect(reducers.unfriendPlayer).toHaveBeenCalledWith({ friendIdentityHex: 'friend' });
    expect(reducers.sendDirectMessage).toHaveBeenCalledWith({
      recipientIdentityHex: 'friend',
      body: 'hello there',
    });
    facade.disconnect();
  });

  it('subscribes only the selected direct conversation and preserves mapped history', () => {
    const table = createTable([
      {
        messageId: 'one',
        conversationKey: 'friend:self',
        senderIdentity: identity('friend'),
        recipientIdentity: identity('self'),
        username: 'Juniper',
        character: 'juniper',
        frame: 'emerald',
        playerLevel: 10,
        body: 'Still here.',
        sentAt: timestamp(1000),
      },
      {
        messageId: 'other',
        conversationKey: 'other:self',
        senderIdentity: identity('other'),
        recipientIdentity: identity('self'),
        body: 'Not selected.',
        sentAt: timestamp(2000),
      },
    ]);
    const connection = createConnection({ ownDirectMessage: table });
    const manager = new DirectMessageSubscriptionManager();
    manager.connect(connection, identity('self'));

    expect(manager.open('friend')).toBe(true);
    expect(connection.lastQuery).toBe(
      "SELECT * FROM own_direct_message WHERE conversation_key = 'friend:self'",
    );
    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      conversationKey: 'friend:self',
      messages: [{ id: 'one', username: 'Juniper', body: 'Still here.', isOwn: false }],
    });
    manager.close();
    expect(connection.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

function createConnection({ reducers = {}, ownDirectMessage = createTable() } = {}) {
  const connection = {
    db: {
      ownFriendship: createTable(),
      ownIncomingFriendRequest: createTable(),
      ownOutgoingFriendRequest: createTable(),
      ownDirectMessage,
    },
    reducers,
    lastQuery: '',
    unsubscribe: vi.fn(),
    subscriptionBuilder() {
      return {
        onApplied(callback) { this.applied = callback; return this; },
        onError() { return this; },
        subscribe: (query) => {
          connection.lastQuery = query;
          return { isEnded: () => false, unsubscribe: connection.unsubscribe };
        },
      };
    },
  };
  return connection;
}

function createTable(rows = []) {
  const listeners = new Set();
  return {
    rows,
    iter: () => rows.values(),
    onInsert: (listener) => listeners.add(listener),
    onUpdate: (listener) => listeners.add(listener),
    onDelete: (listener) => listeners.add(listener),
    removeOnInsert: (listener) => listeners.delete(listener),
    removeOnUpdate: (listener) => listeners.delete(listener),
    removeOnDelete: (listener) => listeners.delete(listener),
    emitInsert: () => listeners.forEach((listener) => listener()),
  };
}

function playerRow(overrides = {}) {
  return {
    username: 'Wizard',
    allianceTag: 'MOSS',
    allianceTagColor: 'green',
    character: 'elara',
    frame: 'classic',
    playerLevel: 7,
    prestigeCount: 2,
    totalProducedGold: 123_456n,
    connected: true,
    lastSeenAt: timestamp(1000),
    createdAt: timestamp(500),
    ...overrides,
  };
}

function identity(value) {
  return { toHexString: () => value };
}

function timestamp(ms) {
  return { toMillis: () => ms };
}

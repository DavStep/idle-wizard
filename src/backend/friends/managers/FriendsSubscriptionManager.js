import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizePlayerFrame } from '../../../player/playerFrames.js';
import { EMPTY_FRIENDS_SNAPSHOT } from './FriendsStateObserverManager.js';

const FRIENDS_QUERY = 'SELECT * FROM own_friendship';
const INCOMING_QUERY = 'SELECT * FROM own_incoming_friend_request';
const OUTGOING_QUERY = 'SELECT * FROM own_outgoing_friend_request';

export class FriendsSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.tables = {};
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_FRIENDS_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.tables = {
      friends: this.findTable('ownFriendship', 'own_friendship'),
      incoming: this.findTable(
        'ownIncomingFriendRequest',
        'own_incoming_friend_request',
      ),
      outgoing: this.findTable(
        'ownOutgoingFriendRequest',
        'own_outgoing_friend_request',
      ),
    };

    for (const table of Object.values(this.tables)) {
      this.bindTable(table);
    }
    this.subscriptions = [
      this.subscribe(this.tables.friends, FRIENDS_QUERY),
      this.subscribe(this.tables.incoming, INCOMING_QUERY),
      this.subscribe(this.tables.outgoing, OUTGOING_QUERY),
    ].filter(Boolean);
    this.publishFromTables();
  }

  disconnect() {
    for (const table of Object.values(this.tables)) {
      this.unbindTable(table);
    }
    for (const subscription of this.subscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }
    this.connection = null;
    this.tables = {};
    this.subscriptions = [];
    this.publish({ ...EMPTY_FRIENDS_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  findTable(camelName, snakeName) {
    return this.connection?.db?.[camelName] ?? this.connection?.db?.[snakeName] ?? null;
  }

  bindTable(table) {
    table?.onInsert?.(this.handleTableChange);
    table?.onUpdate?.(this.handleTableChange);
    table?.onDelete?.(this.handleTableChange);
  }

  unbindTable(table) {
    table?.removeOnInsert?.(this.handleTableChange);
    table?.removeOnUpdate?.(this.handleTableChange);
    table?.removeOnDelete?.(this.handleTableChange);
  }

  subscribe(table, query) {
    if (!table || !this.connection?.subscriptionBuilder) {
      return null;
    }
    return this.connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => this.publish({ ...EMPTY_FRIENDS_SNAPSHOT }))
      .subscribe(query);
  }

  publishFromTables() {
    if (!this.tables.friends && !this.tables.incoming && !this.tables.outgoing) {
      this.publish({ ...EMPTY_FRIENDS_SNAPSHOT });
      return;
    }
    this.publish({
      connected: true,
      friends: this.mapRows(this.tables.friends, 'friend'),
      incomingRequests: this.mapRows(this.tables.incoming, 'request'),
      outgoingRequests: this.mapRows(this.tables.outgoing, 'request'),
    });
  }

  mapRows(table, kind) {
    if (!table) {
      return [];
    }
    return Array.from(table.iter())
      .map((row) => this.mapPlayerRow(row, kind))
      .filter((row) => row.identity && row.username)
      .sort((left, right) => left.username.localeCompare(right.username));
  }

  mapPlayerRow(row, kind) {
    return {
      key: String(
        kind === 'friend'
          ? row.friendshipKey ?? row.friendship_key ?? ''
          : row.requestKey ?? row.request_key ?? '',
      ),
      identity: this.toId(
        kind === 'friend'
          ? row.friendIdentity ?? row.friend_identity
          : row.playerIdentity ?? row.player_identity,
      ),
      username: String(row.username ?? '').trim(),
      character: normalizePlayerCharacter(row.character),
      frame: normalizePlayerFrame(row.frame),
      playerLevel: Math.max(1, Math.floor(Number(row.playerLevel ?? row.player_level) || 1)),
      connected: Boolean(row.connected),
      allianceTag: String(row.allianceTag ?? row.alliance_tag ?? '')
        .trim()
        .toUpperCase(),
      allianceTagColor: String(
        row.allianceTagColor ?? row.alliance_tag_color ?? '',
      ),
      statusMessage: String(
        row.statusMessage ?? row.status_message ?? row.lastMessagePreview ?? '',
      ).trim(),
      unread: Boolean(row.unread ?? row.hasUnreadMessage ?? row.has_unread_message),
      lastSeenAtMs: this.toTimestampMs(row.lastSeenAt ?? row.last_seen_at),
      createdAtMs: this.toTimestampMs(row.createdAt ?? row.created_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  toId(value) {
    return typeof value?.toHexString === 'function' ? value.toHexString() : String(value ?? '');
  }

  toTimestampMs(value) {
    if (typeof value?.toMillis === 'function') return Number(value.toMillis());
    if (typeof value?.microsSinceUnixEpoch === 'bigint') {
      return Number(value.microsSinceUnixEpoch / 1000n);
    }
    if (typeof value?.__timestamp_micros_since_unix_epoch__ === 'bigint') {
      return Number(value.__timestamp_micros_since_unix_epoch__ / 1000n);
    }
    return Number(value) || 0;
  }
}

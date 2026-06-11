const WORLD_CHAT_QUERY = 'SELECT * FROM world_chat';
const MESSAGE_LIMIT = 40;
const EMPTY_SNAPSHOT = {
  connected: false,
  messages: [],
};

export class WorldChatSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.table = connection?.db?.worldChat ?? connection?.db?.world_chat ?? null;

    if (!this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.table.onInsert?.(this.handleTableChange);
    this.table.onUpdate?.(this.handleTableChange);
    this.table.onDelete?.(this.handleTableChange);

    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(WORLD_CHAT_QUERY);
    this.publishFromTable();
  }

  disconnect() {
    if (this.table) {
      this.table.removeOnInsert?.(this.handleTableChange);
      this.table.removeOnUpdate?.(this.handleTableChange);
      this.table.removeOnDelete?.(this.handleTableChange);
    }

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const messages = Array.from(this.table.iter())
      .map((row) => this.mapRow(row))
      .filter((message) => message.body)
      .sort((left, right) => {
        if (left.sentAtMs !== right.sentAtMs) {
          return left.sentAtMs - right.sentAtMs;
        }

        return left.id.localeCompare(right.id);
      })
      .slice(-MESSAGE_LIMIT);

    this.publish({
      connected: true,
      messages,
    });
  }

  mapRow(row) {
    return {
      id: this.toId(row.messageId ?? row.message_id),
      senderIdentity: this.toId(row.senderIdentity ?? row.sender_identity),
      username: typeof row.username === 'string' ? row.username : 'wizard',
      playerLevel: this.toPlayerLevel(
        row.playerLevel ?? row.player_level,
        row.username === 'system' ? null : 1,
      ),
      body: typeof row.body === 'string' ? row.body : '',
      allianceTag: typeof row.allianceTag === 'string' ? row.allianceTag : '',
      sentAtMs: this.toTimestampMs(row.sentAt ?? row.sent_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  toId(value) {
    if (!value) {
      return '';
    }

    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }

    return String(value);
  }

  toTimestampMs(value) {
    if (!value) {
      return 0;
    }

    if (typeof value.toMillis === 'function') {
      return Number(value.toMillis());
    }

    if (typeof value.microsSinceUnixEpoch === 'bigint') {
      return Number(value.microsSinceUnixEpoch / 1000n);
    }

    if (typeof value.__timestamp_micros_since_unix_epoch__ === 'bigint') {
      return Number(value.__timestamp_micros_since_unix_epoch__ / 1000n);
    }

    return Number.isFinite(value) ? value : 0;
  }

  toPlayerLevel(value, fallback = 1) {
    if (value === null || value === undefined) {
      return fallback;
    }

    const playerLevel = typeof value === 'bigint' ? Number(value) : value;

    if (!Number.isFinite(playerLevel) || playerLevel < 1) {
      return fallback;
    }

    return Math.floor(playerLevel);
  }
}

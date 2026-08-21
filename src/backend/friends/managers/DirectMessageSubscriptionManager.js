import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizePlayerFrame } from '../../../player/playerFrames.js';

const EMPTY_SNAPSHOT = Object.freeze({ connected: false, conversationKey: '', messages: [] });

export class DirectMessageSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.identityKey = '';
    this.conversationKey = '';
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identityKey = this.toId(identity);
    this.table = connection?.db?.ownDirectMessage ?? connection?.db?.own_direct_message ?? null;
    this.table?.onInsert?.(this.handleTableChange);
    this.table?.onUpdate?.(this.handleTableChange);
    this.table?.onDelete?.(this.handleTableChange);
  }

  open(friendIdentity) {
    this.close();
    if (!this.connection || !this.table) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return false;
    }
    this.conversationKey = [this.identityKey, this.toId(friendIdentity)]
      .map((value) => value.toLowerCase().replace(/^0x/, ''))
      .sort()
      .join(':');
    if (!this.conversationKey || this.conversationKey === ':') {
      return false;
    }
    const safeKey = this.conversationKey.replaceAll("'", "''");
    this.subscription = this.connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(`SELECT * FROM own_direct_message WHERE conversation_key = '${safeKey}'`);
    this.publishFromTable();
    return true;
  }

  close() {
    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }
    this.subscription = null;
    this.conversationKey = '';
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  disconnect() {
    this.close();
    this.table?.removeOnInsert?.(this.handleTableChange);
    this.table?.removeOnUpdate?.(this.handleTableChange);
    this.table?.removeOnDelete?.(this.handleTableChange);
    this.connection = null;
    this.table = null;
    this.identityKey = '';
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table || !this.conversationKey) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }
    const messages = Array.from(this.table.iter())
      .filter((row) => String(row.conversationKey ?? row.conversation_key ?? '') === this.conversationKey)
      .map((row) => this.mapRow(row))
      .filter((row) => row.body)
      .sort((left, right) => left.sentAtMs - right.sentAtMs || left.id.localeCompare(right.id));
    this.publish({ connected: true, conversationKey: this.conversationKey, messages });
  }

  mapRow(row) {
    const senderIdentity = this.toId(row.senderIdentity ?? row.sender_identity);
    return {
      id: String(row.messageId ?? row.message_id ?? ''),
      senderIdentity,
      recipientIdentity: this.toId(row.recipientIdentity ?? row.recipient_identity),
      isOwn: senderIdentity.toLowerCase() === this.identityKey.toLowerCase(),
      username: String(row.username ?? 'Wizard'),
      character: normalizePlayerCharacter(row.character),
      frame: normalizePlayerFrame(row.frame),
      playerLevel: Math.max(1, Math.floor(Number(row.playerLevel ?? row.player_level) || 1)),
      body: String(row.body ?? ''),
      allianceTag: '',
      allianceTagColor: 'ink',
      sentAtMs: this.toTimestampMs(row.sentAt ?? row.sent_at),
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
    if (typeof value?.microsSinceUnixEpoch === 'bigint') return Number(value.microsSinceUnixEpoch / 1000n);
    if (typeof value?.__timestamp_micros_since_unix_epoch__ === 'bigint') {
      return Number(value.__timestamp_micros_since_unix_epoch__ / 1000n);
    }
    return Number(value) || 0;
  }
}

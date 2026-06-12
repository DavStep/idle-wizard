const OWN_PLAYER_SESSION_QUERY = 'SELECT * FROM own_player_session';

const EMPTY_SNAPSHOT = {
  connected: false,
  active: true,
  activeConnectionId: '',
  ownConnectionId: '',
  updatedAtMs: 0,
};

export class AccountSessionSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.connectionId = null;
    this.table = null;
    this.subscription = null;
    this.onInactive = null;
    this.inactiveDelivered = false;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  connect(connection, { onInactive } = {}) {
    this.disconnect();
    this.connection = connection;
    this.connectionId = connection?.connectionId ?? null;
    this.onInactive = typeof onInactive === 'function' ? onInactive : null;
    this.inactiveDelivered = false;
    this.table =
      connection?.db?.ownPlayerSession ??
      connection?.db?.own_player_session ??
      null;

    if (!this.table || !this.connectionId) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return false;
    }

    this.bindTable(this.table);
    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(OWN_PLAYER_SESSION_QUERY);

    return true;
  }

  disconnect() {
    this.unbindTable(this.table);

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    this.connection = null;
    this.connectionId = null;
    this.table = null;
    this.subscription = null;
    this.onInactive = null;
    this.inactiveDelivered = false;
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
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

  publishFromTable() {
    if (!this.table || !this.connectionId) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const row = this.table.iter().next().value ?? null;
    const activeConnectionId =
      row?.activeConnectionId ?? row?.active_connection_id ?? null;
    const activeConnectionIdKey = this.toConnectionIdKey(activeConnectionId);
    const ownConnectionIdKey = this.toConnectionIdKey(this.connectionId);
    const active =
      !activeConnectionId ||
      !ownConnectionIdKey ||
      this.isSameConnectionId(activeConnectionId, this.connectionId);

    this.publish({
      connected: true,
      active,
      activeConnectionId: activeConnectionIdKey,
      ownConnectionId: ownConnectionIdKey,
      updatedAtMs: this.toTimestampMs(row?.updatedAt ?? row?.updated_at),
    });

    if (!active) {
      this.deliverInactive();
    }
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  deliverInactive() {
    if (this.inactiveDelivered) {
      return;
    }

    this.inactiveDelivered = true;
    this.onInactive?.({ reason: 'account_in_use' });
  }

  isSameConnectionId(left, right) {
    if (!left || !right) {
      return false;
    }

    if (typeof left.isEqual === 'function') {
      return left.isEqual(right);
    }

    if (typeof right.isEqual === 'function') {
      return right.isEqual(left);
    }

    return this.toConnectionIdKey(left) === this.toConnectionIdKey(right);
  }

  toConnectionIdKey(connectionId) {
    if (!connectionId) {
      return '';
    }

    if (typeof connectionId === 'string') {
      return connectionId;
    }

    if (typeof connectionId.toHexString === 'function') {
      return connectionId.toHexString();
    }

    if (typeof connectionId.__connection_id__ === 'bigint') {
      return connectionId.__connection_id__.toString(16);
    }

    return String(connectionId);
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
}

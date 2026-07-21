const OWN_PLAYER_SESSION_QUERY = 'SELECT * FROM own_player_session';

const EMPTY_SNAPSHOT = {
  connected: false,
  active: false,
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
    this.handleTableInsert = (_context, row) =>
      row ? this.publishRow(row) : this.publishFromTable();
    this.handleTableUpdate = (_context, _oldRow, newRow) =>
      newRow ? this.publishRow(newRow) : this.publishFromTable();
    this.handleTableDelete = () => this.publishRow(null);
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
      this.publishInactive({
        connected: false,
        reason: 'account_session_error',
      });
      return false;
    }

    const table = this.table;
    this.bindTable(table);
    const subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() =>
        this.publishInactive({
          connected: false,
          reason: 'account_session_error',
        }),
      )
      .subscribe(OWN_PLAYER_SESSION_QUERY);

    if (this.connection !== connection || this.table !== table) {
      if (!subscription?.isEnded?.()) {
        subscription?.unsubscribe?.();
      }
      return false;
    }

    this.subscription = subscription;

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
    table?.onInsert?.(this.handleTableInsert);
    table?.onUpdate?.(this.handleTableUpdate);
    table?.onDelete?.(this.handleTableDelete);
  }

  unbindTable(table) {
    table?.removeOnInsert?.(this.handleTableInsert);
    table?.removeOnUpdate?.(this.handleTableUpdate);
    table?.removeOnDelete?.(this.handleTableDelete);
  }

  publishFromTable() {
    if (!this.table || !this.connectionId) {
      this.publishInactive({ connected: false });
      return;
    }

    const row = this.table.iter().next().value ?? null;
    this.publishRow(row);
  }

  publishRow(row) {
    const activeConnectionId =
      row?.activeConnectionId ?? row?.active_connection_id ?? null;
    const activeConnectionIdKey = this.toConnectionIdKey(activeConnectionId);
    const ownConnectionIdKey = this.toConnectionIdKey(this.connectionId);
    const active = Boolean(
      row &&
        activeConnectionIdKey &&
        ownConnectionIdKey &&
        this.isSameConnectionId(activeConnectionId, this.connectionId),
    );

    this.publish({
      connected: true,
      active,
      activeConnectionId: activeConnectionIdKey,
      ownConnectionId: ownConnectionIdKey,
      updatedAtMs: this.toTimestampMs(row?.updatedAt ?? row?.updated_at),
    });

    if (!active) {
      this.deliverInactive(row ? 'account_in_use' : 'account_session_missing');
    }
  }

  publishInactive({ connected = false, reason = 'account_in_use' } = {}) {
    this.publish({
      ...EMPTY_SNAPSHOT,
      connected,
      ownConnectionId: this.toConnectionIdKey(this.connectionId),
    });
    this.deliverInactive(reason);
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  deliverInactive(reason = 'account_in_use') {
    if (this.inactiveDelivered) {
      return;
    }

    this.inactiveDelivered = true;
    this.onInactive?.({ reason });
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

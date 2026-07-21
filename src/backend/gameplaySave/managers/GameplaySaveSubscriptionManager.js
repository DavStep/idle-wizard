const OWN_PLAYER_GAMEPLAY_SAVE_QUERY = 'SELECT * FROM own_player_gameplay_save';
const EMPTY_SNAPSHOT = {
  connected: false,
  save: null,
  updatedAtMs: 0,
};

export class GameplaySaveSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identity = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.readyCallback = null;
    this.readyDelivered = false;
    this.handleTableInsert = (_context, row) => this.publishFromRow(row);
    this.handleTableUpdate = (_context, _oldRow, newRow) =>
      this.publishFromRow(newRow);
    this.handleTableDelete = () => this.publishFromTable();
  }

  connect(connection, identity, { onReady } = {}) {
    this.disconnect();
    this.connection = connection;
    this.identity = identity;
    this.readyCallback = onReady;
    this.readyDelivered = false;
    this.table =
      connection?.db?.ownPlayerGameplaySave ??
      connection?.db?.own_player_gameplay_save ??
      null;

    if (!this.table || !this.identity) {
      this.publish({ ...EMPTY_SNAPSHOT });
      this.deliverReady({
        ok: false,
        reason: 'gameplay_save_missing',
      });
      return false;
    }

    const table = this.table;
    this.bindTable(table);
    const subscription = connection
      .subscriptionBuilder()
      .onApplied(() => {
        this.publishFromTable();
        this.deliverReady({
          ok: true,
          save: this.snapshot.save,
          updatedAtMs: this.snapshot.updatedAtMs,
        });
      })
      .onError(() => {
        this.publish({ ...EMPTY_SNAPSHOT });
        this.deliverReady({
          ok: false,
          reason: 'gameplay_save_subscription_error',
        });
      })
      .subscribe(OWN_PLAYER_GAMEPLAY_SAVE_QUERY);

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
    this.identity = null;
    this.table = null;
    this.subscription = null;
    this.readyCallback = null;
    this.readyDelivered = false;
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
    if (!this.table || !this.identity) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const row = this.table.iter().next().value ?? null;
    this.publishFromRow(row);
  }

  publishFromRow(row) {
    if (!this.table || !this.identity) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.publish({
      connected: true,
      save: row ? this.parseSave(row.saveJson ?? row.save_json) : null,
      updatedAtMs: this.toTimestampMs(row?.updatedAt ?? row?.updated_at),
    });
  }

  parseSave(saveJson) {
    if (typeof saveJson !== 'string' || !saveJson.trim()) {
      return null;
    }

    try {
      const save = JSON.parse(saveJson);
      return save && typeof save === 'object' ? save : null;
    } catch {
      return null;
    }
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  deliverReady(result) {
    if (this.readyDelivered) {
      return;
    }

    this.readyDelivered = true;
    this.readyCallback?.(result);
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

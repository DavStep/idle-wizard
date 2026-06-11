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
    this.handleTableChange = () => this.publishFromTable();
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

    this.bindTable(this.table);
    this.subscription = connection
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
    if (!this.table || !this.identity) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    const row = this.table.iter().next().value ?? null;

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

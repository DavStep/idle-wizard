import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';

const PLAYER_INFO_QUERY = 'SELECT * FROM player_info_summary';
const EMPTY_SNAPSHOT = {
  connected: false,
  players: [],
};

export class PlayerInfoSubscriptionManager {
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
    this.table =
      connection?.db?.playerInfoSummary ?? connection?.db?.player_info_summary ?? null;

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
      .subscribe(PLAYER_INFO_QUERY);
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

    const players = Array.from(this.table.iter())
      .map((row) => this.mapRow(row))
      .filter((player) => player.identity && player.username)
      .sort((left, right) => left.username.localeCompare(right.username));

    this.publish({
      connected: true,
      players,
    });
  }

  mapRow(row) {
    const username = row.username;

    return {
      identity: this.toIdentityKey(row.identity),
      username: typeof username === 'string' ? username : 'wizard',
      allianceTag: this.normalizeAllianceTag(row.allianceTag ?? row.alliance_tag),
      allianceTagColor: normalizeTradeAllianceTagColor(
        row.allianceTagColor ?? row.alliance_tag_color,
      ),
      totalProducedGold: this.toNumber(
        row.totalProducedGold ?? row.total_produced_gold,
      ),
      playerLevel: this.toPositiveInteger(row.playerLevel ?? row.player_level, {
        fallback: 1,
        min: 1,
      }),
      prestigeCount: this.toPositiveInteger(
        row.prestigeCount ?? row.prestige_count,
        { fallback: 0, min: 0 },
      ),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  normalizeAllianceTag(tag) {
    const normalized = String(tag ?? '')
      .trim()
      .toUpperCase();

    return /^[A-Z]{2,5}$/.test(normalized) ? normalized : '';
  }

  toPositiveInteger(value, { fallback, min }) {
    const number = this.toNumber(value);

    if (!Number.isFinite(number) || number < min) {
      return fallback;
    }

    return Math.floor(number);
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number.isFinite(value) ? Number(value) : 0;
  }

  toIdentityKey(identity) {
    if (!identity) {
      return '';
    }

    if (typeof identity === 'string') {
      return identity;
    }

    if (typeof identity.toHexString === 'function') {
      return identity.toHexString();
    }

    return String(identity);
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

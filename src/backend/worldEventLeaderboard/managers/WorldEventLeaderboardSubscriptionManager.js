import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';

const WORLD_EVENT_LEADERBOARD_QUERY = 'SELECT * FROM world_event_leaderboard_summary';
const LEGACY_WORLD_EVENT_LEADERBOARD_QUERY = 'SELECT * FROM world_event_leaderboard';
const TOP_USER_LIMIT = 100;
const EMPTY_SNAPSHOT = {
  connected: false,
  periodKey: '',
  eventId: '',
  topWorldEventUsers: [],
  topUsers: [],
  currentWorldEventUser: null,
  currentUser: null,
};

export class WorldEventLeaderboardSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identityKey = '';
    this.table = null;
    this.subscription = null;
    this.gameplayFacade = null;
    this.unsubscribeGameplay = null;
    this.activeEvent = null;
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTable();
  }

  setGameplayFacade(gameplayFacade) {
    this.unsubscribeGameplay?.();
    this.unsubscribeGameplay = null;
    this.gameplayFacade = gameplayFacade;
    this.activeEvent = null;

    if (!gameplayFacade) {
      this.publishFromTable();
      return;
    }

    this.unsubscribeGameplay = gameplayFacade.subscribe((snapshot) => {
      const nextEvent = this.readActiveEvent(snapshot);
      if (this.isSameEvent(nextEvent, this.activeEvent)) {
        return;
      }

      this.activeEvent = nextEvent;
      this.publishFromTable();
    });
    this.activeEvent = this.readActiveEvent(gameplayFacade.getSnapshot());
    this.publishFromTable();
  }

  connect(connection, identity) {
    this.disconnect({ keepGameplay: true });
    this.connection = connection;
    this.identityKey = this.toIdentityKey(identity);
    this.table = this.findTable(connection);

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
      .subscribe(this.getQuery());
    this.publishFromTable();
  }

  disconnect({ keepGameplay = false } = {}) {
    if (this.table) {
      this.table.removeOnInsert?.(this.handleTableChange);
      this.table.removeOnUpdate?.(this.handleTableChange);
      this.table.removeOnDelete?.(this.handleTableChange);
    }

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    if (!keepGameplay) {
      this.unsubscribeGameplay?.();
      this.unsubscribeGameplay = null;
      this.gameplayFacade = null;
      this.activeEvent = null;
    }

    this.connection = null;
    this.identityKey = '';
    this.table = null;
    this.subscription = null;
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table || !this.activeEvent) {
      this.publish({
        ...EMPTY_SNAPSHOT,
        ...(this.activeEvent ?? {}),
      });
      return;
    }

    const rows = Array.from(this.table.iter())
      .map((row) => this.toSnapshotUser(row))
      .filter((row) => this.isSameEvent(row, this.activeEvent))
      .sort((left, right) => {
        if (left.points !== right.points) {
          return right.points - left.points;
        }

        return left.identity.localeCompare(right.identity);
      })
      .map((row, index) => ({
        ...row,
        rank: row.rank || index + 1,
      }));
    const topWorldEventUsers = rows.slice(0, TOP_USER_LIMIT);
    const currentWorldEventUser = this.identityKey
      ? rows.find((row) => row.identity === this.identityKey) ?? null
      : null;

    this.publish({
      connected: true,
      periodKey: this.activeEvent.periodKey,
      eventId: this.activeEvent.eventId,
      topWorldEventUsers,
      topUsers: topWorldEventUsers,
      currentWorldEventUser,
      currentUser: currentWorldEventUser,
    });
  }

  toSnapshotUser(row) {
    return {
      identity: this.toIdentityKey(row.identity),
      periodKey: String(row.periodKey ?? row.period_key ?? ''),
      eventId: String(row.eventId ?? row.event_id ?? ''),
      rank: this.toRank(row.rank),
      name: String(row.username ?? row.name ?? ''),
      playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
      allianceTag: this.toAllianceTag(row.allianceTag ?? row.alliance_tag),
      allianceTagColor: normalizeTradeAllianceTagColor(
        row.allianceTagColor ?? row.alliance_tag_color,
      ),
      character: normalizePlayerCharacter(row.character),
      points: this.toNumber(row.points),
    };
  }

  readActiveEvent(snapshot) {
    const notice = snapshot?.worldNotice?.current;
    const periodKey = String(notice?.periodKey ?? '').trim();
    const eventId = String(notice?.eventId ?? '').trim();

    if (!periodKey || !eventId) {
      return null;
    }

    return {
      periodKey,
      eventId,
    };
  }

  isSameEvent(left, right) {
    return (
      Boolean(left) &&
      Boolean(right) &&
      left.periodKey === right.periodKey &&
      left.eventId === right.eventId
    );
  }

  findTable(connection) {
    return (
      connection?.db?.worldEventLeaderboardSummary ??
      connection?.db?.world_event_leaderboard_summary ??
      connection?.db?.worldEventLeaderboard ??
      connection?.db?.world_event_leaderboard ??
      null
    );
  }

  getQuery() {
    return (
      this.connection?.db?.worldEventLeaderboardSummary ||
      this.connection?.db?.world_event_leaderboard_summary
    )
      ? WORLD_EVENT_LEADERBOARD_QUERY
      : LEGACY_WORLD_EVENT_LEADERBOARD_QUERY;
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  toRank(value) {
    const rank = Math.floor(this.toNumber(value));
    return Number.isFinite(rank) && rank > 0 ? rank : null;
  }

  toAllianceTag(value) {
    const tag = String(value ?? '')
      .trim()
      .toUpperCase();

    return /^[A-Z]{2,5}$/.test(tag) ? tag : '';
  }

  toPlayerLevel(value, fallback = 1) {
    const playerLevel = Math.floor(this.toNumber(value));
    return Number.isFinite(playerLevel) && playerLevel >= 1 ? playerLevel : fallback;
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

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }
}

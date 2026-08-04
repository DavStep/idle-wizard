import { EMPTY_PLAYER_INBOX_SNAPSHOT } from './PlayerInboxStateObserverManager.js';

const PLAYER_INBOX_QUERY = 'SELECT * FROM own_player_inbox_mail';

export class PlayerInboxSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.snapshot = { ...EMPTY_PLAYER_INBOX_SNAPSHOT };
    this.handleTableInsert = (_context, row) =>
      row ? this.upsertRow(row) : this.publishFromTable();
    this.handleTableUpdate = (_context, _oldRow, newRow) =>
      newRow ? this.upsertRow(newRow) : this.publishFromTable();
    this.handleTableDelete = (_context, row) =>
      row ? this.removeRow(row) : this.publishFromTable();
  }

  connect(connection) {
    this.disconnect();
    this.connection = connection;
    this.table =
      connection?.db?.ownPlayerInboxMail ?? connection?.db?.own_player_inbox_mail ?? null;

    if (!this.table) {
      this.publish({ ...EMPTY_PLAYER_INBOX_SNAPSHOT });
      return;
    }

    this.table.onInsert?.(this.handleTableInsert);
    this.table.onUpdate?.(this.handleTableUpdate);
    this.table.onDelete?.(this.handleTableDelete);

    this.subscription = connection
      .subscriptionBuilder()
      .onApplied(() => this.publishFromTable())
      .onError(() => this.publish({ ...EMPTY_PLAYER_INBOX_SNAPSHOT }))
      .subscribe(PLAYER_INBOX_QUERY);
    this.publishFromTable();
  }

  disconnect() {
    if (this.table) {
      this.table.removeOnInsert?.(this.handleTableInsert);
      this.table.removeOnUpdate?.(this.handleTableUpdate);
      this.table.removeOnDelete?.(this.handleTableDelete);
    }

    if (this.subscription && !this.subscription.isEnded?.()) {
      this.subscription.unsubscribe();
    }

    this.connection = null;
    this.table = null;
    this.subscription = null;
    this.publish({ ...EMPTY_PLAYER_INBOX_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishFromTable() {
    if (!this.table) {
      this.publish({ ...EMPTY_PLAYER_INBOX_SNAPSHOT });
      return;
    }

    const mail = Array.from(this.table.iter())
      .map((row) => this.mapRow(row))
      .filter((row) => row.mailKey);
    this.publishMail(mail);
  }

  upsertRow(row) {
    const nextMail = this.mapRow(row);
    if (!nextMail.mailKey) {
      return;
    }

    const mail = [...(this.snapshot.mail ?? [])];
    const index = mail.findIndex(
      (candidate) => candidate.mailKey === nextMail.mailKey,
    );
    if (index >= 0) {
      mail[index] = nextMail;
    } else {
      mail.push(nextMail);
    }
    this.publishMail(mail);
  }

  removeRow(row) {
    const mailKey = String(row?.mailKey ?? row?.mail_key ?? '');
    if (!mailKey) {
      return;
    }
    this.publishMail(
      (this.snapshot.mail ?? []).filter(
        (candidate) => candidate.mailKey !== mailKey,
      ),
    );
  }

  publishMail(mail) {
    const sortedMail = [...mail].sort((left, right) => {
        if (left.createdAtMs !== right.createdAtMs) {
          return right.createdAtMs - left.createdAtMs;
        }

        return left.mailKey.localeCompare(right.mailKey);
      });
    const unreadCount = sortedMail.filter((row) => !row.read).length;
    const claimableCount = sortedMail.filter(
      (row) => row.hasReward && !row.rewardCollected,
    ).length;

    this.publish({
      connected: true,
      mail: sortedMail,
      unreadCount,
      claimableCount,
      hasNotification: unreadCount > 0 || claimableCount > 0,
    });
  }

  mapRow(row) {
    const reward = {
      coin: this.toNumber(row.coinReward ?? row.coin_reward),
      crystal: this.toNumber(row.crystalReward ?? row.crystal_reward),
      ruby: this.toNumber(row.rubyReward ?? row.ruby_reward),
      emerald: this.toNumber(row.emeraldReward ?? row.emerald_reward),
      items: this.parseItemRewards(row.itemRewardsJson ?? row.item_rewards_json),
    };
    const hasReward = this.hasReward(reward);
    const rewardText =
      String(row.rewardText ?? row.reward_text ?? '').trim() ||
      this.createRewardText(reward);

    return {
      mailKey: String(row.mailKey ?? row.mail_key ?? ''),
      sourceType: String(row.sourceType ?? row.source_type ?? ''),
      sourceKey: String(row.sourceKey ?? row.source_key ?? ''),
      senderLabel: String(row.senderLabel ?? row.sender_label ?? 'system'),
      title: String(row.title ?? 'message'),
      body: String(row.body ?? ''),
      createdAtMs: this.toTimestampMs(row.createdAt ?? row.created_at),
      read: Boolean(row.read ?? false),
      hasReward,
      rewardCollected: Boolean(row.rewardCollected ?? row.reward_collected ?? !hasReward),
      rewardText,
      reward,
    };
  }

  parseItemRewards(value) {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(String(value));
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => ({
          itemKey: String(item?.itemKey ?? '').trim(),
          quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)),
        }))
        .filter((item) => item.itemKey && item.quantity > 0);
    } catch {
      return [];
    }
  }

  createRewardText(reward) {
    const parts = [];

    for (const key of ['coin', 'crystal', 'ruby', 'emerald']) {
      if (reward[key] > 0) {
        parts.push(`${reward[key]} ${key}`);
      }
    }

    for (const item of reward.items) {
      parts.push(`${item.quantity} ${item.itemKey}`);
    }

    return parts.join(', ');
  }

  hasReward(reward) {
    return (
      reward.coin > 0 ||
      reward.crystal > 0 ||
      reward.ruby > 0 ||
      reward.emerald > 0 ||
      reward.items.length > 0
    );
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
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

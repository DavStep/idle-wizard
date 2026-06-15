const ALLIANCES_QUERY = 'SELECT * FROM trade_alliance_snapshot';
const MEMBERS_QUERY = 'SELECT * FROM trade_alliance_member_snapshot';
const APPLICATIONS_QUERY = 'SELECT * FROM trade_alliance_application_snapshot';
const QUESTS_QUERY = 'SELECT * FROM trade_alliance_quest_progress_snapshot';
const CONTRIBUTIONS_QUERY = 'SELECT * FROM trade_alliance_quest_contribution_snapshot';
const LEGACY_ALLIANCES_QUERY = 'SELECT * FROM trade_alliance';
const LEGACY_MEMBERS_QUERY = 'SELECT * FROM trade_alliance_member';
const LEGACY_APPLICATIONS_QUERY = 'SELECT * FROM trade_alliance_application';
const LEGACY_QUESTS_QUERY = 'SELECT * FROM trade_alliance_quest_progress';
const LEGACY_CONTRIBUTIONS_QUERY = 'SELECT * FROM trade_alliance_quest_contribution';
const CHAT_QUERY = 'SELECT * FROM own_trade_alliance_chat';
const REWARDS_QUERY = 'SELECT * FROM own_trade_alliance_reward_inbox';
const MESSAGE_LIMIT = 40;
const TOP_ALLIANCE_LIMIT = 10;
const ITEM_FILL_QUEST_TYPE = 'itemFill';
const ITEM_FILL_QUEST_PREFIX = 'itemFill:';

const EMPTY_SNAPSHOT = {
  connected: false,
  alliances: [],
  members: [],
  applications: [],
  quests: [],
  contributions: [],
  allianceChatMessages: [],
  rewardInbox: [],
  ownMember: null,
  ownAlliance: null,
  ownApplications: [],
  ownRole: null,
  canEditSettings: false,
  canManageApplications: false,
  canManageRoles: false,
  topAlliances: [],
  topDailyAlliances: [],
  topWeeklyAlliances: [],
  topMonthlyAlliances: [],
  topAllTimeAlliances: [],
};

const ROLE_RANK = {
  tradeMaster: 5,
  quartermaster: 4,
  factor: 3,
  broker: 2,
  trader: 1,
};

export class TradeAllianceSubscriptionManager {
  constructor({ onSnapshot } = {}) {
    this.onSnapshot = onSnapshot;
    this.connection = null;
    this.identityKey = '';
    this.tables = {};
    this.subscriptions = [];
    this.snapshot = { ...EMPTY_SNAPSHOT };
    this.handleTableChange = () => this.publishFromTables();
  }

  connect(connection, identity) {
    this.disconnect();
    this.connection = connection;
    this.identityKey = this.toIdentityKey(identity);
    const alliances = this.findTableSource({
      camelName: 'tradeAllianceSnapshot',
      snakeName: 'trade_alliance_snapshot',
      query: ALLIANCES_QUERY,
      legacyCamelName: 'tradeAlliance',
      legacySnakeName: 'trade_alliance',
      legacyQuery: LEGACY_ALLIANCES_QUERY,
    });
    const members = this.findTableSource({
      camelName: 'tradeAllianceMemberSnapshot',
      snakeName: 'trade_alliance_member_snapshot',
      query: MEMBERS_QUERY,
      legacyCamelName: 'tradeAllianceMember',
      legacySnakeName: 'trade_alliance_member',
      legacyQuery: LEGACY_MEMBERS_QUERY,
    });
    const applications = this.findTableSource({
      camelName: 'tradeAllianceApplicationSnapshot',
      snakeName: 'trade_alliance_application_snapshot',
      query: APPLICATIONS_QUERY,
      legacyCamelName: 'tradeAllianceApplication',
      legacySnakeName: 'trade_alliance_application',
      legacyQuery: LEGACY_APPLICATIONS_QUERY,
    });
    const quests = this.findTableSource({
      camelName: 'tradeAllianceQuestProgressSnapshot',
      snakeName: 'trade_alliance_quest_progress_snapshot',
      query: QUESTS_QUERY,
      legacyCamelName: 'tradeAllianceQuestProgress',
      legacySnakeName: 'trade_alliance_quest_progress',
      legacyQuery: LEGACY_QUESTS_QUERY,
    });
    const contributions = this.findTableSource({
      camelName: 'tradeAllianceQuestContributionSnapshot',
      snakeName: 'trade_alliance_quest_contribution_snapshot',
      query: CONTRIBUTIONS_QUERY,
      legacyCamelName: 'tradeAllianceQuestContribution',
      legacySnakeName: 'trade_alliance_quest_contribution',
      legacyQuery: LEGACY_CONTRIBUTIONS_QUERY,
    });
    this.tables = {
      alliances: alliances.table,
      members: members.table,
      applications: applications.table,
      quests: quests.table,
      contributions: contributions.table,
      chat: this.findTable('ownTradeAllianceChat', 'own_trade_alliance_chat'),
      rewards: this.findTable('ownTradeAllianceRewardInbox', 'own_trade_alliance_reward_inbox'),
    };
    this.queries = {
      alliances: alliances.query,
      members: members.query,
      applications: applications.query,
      quests: quests.query,
      contributions: contributions.query,
    };

    if (!this.tables.alliances || !this.tables.members) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    for (const table of Object.values(this.tables)) {
      this.bindTable(table);
    }

    this.subscriptions = [
      this.subscribeQuery(this.queries.alliances),
      this.subscribeQuery(this.queries.members),
      this.subscribeQuery(this.queries.applications),
      this.subscribeQuery(this.queries.quests),
      this.subscribeQuery(this.queries.contributions),
      this.subscribeQuery(CHAT_QUERY),
      this.subscribeQuery(REWARDS_QUERY),
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
    this.identityKey = '';
    this.tables = {};
    this.queries = {};
    this.subscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  findTable(camelName, snakeName) {
    return this.connection?.db?.[camelName] ?? this.connection?.db?.[snakeName] ?? null;
  }

  findTableSource({
    camelName,
    snakeName,
    query,
    legacyCamelName,
    legacySnakeName,
    legacyQuery,
  }) {
    const table = this.findTable(camelName, snakeName);
    if (table) {
      return { table, query };
    }

    return {
      table: this.findTable(legacyCamelName, legacySnakeName),
      query: legacyQuery,
    };
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

  subscribeQuery(query) {
    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(query);
  }

  publishFromTables() {
    const alliances = this.readRows(this.tables.alliances, (row) => this.mapAlliance(row))
      .filter((alliance) => alliance.allianceId)
      .sort((left, right) => left.name.localeCompare(right.name));
    const members = this.readRows(this.tables.members, (row) => this.mapMember(row))
      .filter((member) => member.memberIdentity && member.allianceId)
      .sort((left, right) => {
        if (left.roleRank !== right.roleRank) {
          return right.roleRank - left.roleRank;
        }

        return left.joinedAtMs - right.joinedAtMs;
      });
    const applications = this.readRows(this.tables.applications, (row) =>
      this.mapApplication(row),
    ).sort((left, right) => left.createdAtMs - right.createdAtMs);
    const rewardInbox = this.readRows(this.tables.rewards, (row) => this.mapReward(row)).sort(
      (left, right) => {
        if (left.claimedAtMs !== right.claimedAtMs) {
          return left.claimedAtMs - right.claimedAtMs;
        }

        return left.rewardKey.localeCompare(right.rewardKey);
      },
    );
    const claimedQuestKeys = new Set(
      rewardInbox.map((reward) => this.getQuestClaimKey(reward.questId, reward.dayKey)),
    );
    const quests = this.readRows(this.tables.quests, (row) => {
      const quest = this.mapQuest(row);
      return {
        ...quest,
        claimed: claimedQuestKeys.has(this.getQuestClaimKey(quest.questId, quest.dayKey)),
      };
    }).sort(
      (left, right) => {
        if (left.dayKey !== right.dayKey) {
          return right.dayKey.localeCompare(left.dayKey);
        }

        return left.questId.localeCompare(right.questId);
      },
    );
    const contributions = this.readRows(this.tables.contributions, (row) =>
      this.mapContribution(row),
    );
    const allianceChatMessages = this.readRows(this.tables.chat, (row) => this.mapChat(row))
      .filter((message) => message.body)
      .sort((left, right) => {
        if (left.sentAtMs !== right.sentAtMs) {
          return left.sentAtMs - right.sentAtMs;
        }

        return left.id.localeCompare(right.id);
      })
      .slice(-MESSAGE_LIMIT);
    const ownMember =
      members.find((member) => member.memberIdentity === this.identityKey) ?? null;
    const ownAlliance =
      ownMember && alliances.find((alliance) => alliance.allianceId === ownMember.allianceId);
    const ownApplications = applications.filter(
      (application) => application.applicantIdentity === this.identityKey,
    );
    const ownRole = ownMember?.role ?? null;

    this.publish({
      connected: true,
      alliances,
      members,
      applications,
      quests,
      contributions,
      allianceChatMessages,
      rewardInbox,
      ownMember,
      ownAlliance: ownAlliance ?? null,
      ownApplications,
      ownRole,
      canEditSettings: ownRole === 'tradeMaster',
      canManageApplications: this.getRoleRank(ownRole) >= ROLE_RANK.factor,
      canManageRoles: this.getRoleRank(ownRole) >= ROLE_RANK.quartermaster,
      topAlliances: this.rankAlliances(alliances, 'weeklyIncome'),
      topDailyAlliances: this.rankAlliances(alliances, 'dailyIncome'),
      topWeeklyAlliances: this.rankAlliances(alliances, 'weeklyIncome'),
      topMonthlyAlliances: this.rankAlliances(alliances, 'monthlyIncome'),
      topAllTimeAlliances: this.rankAlliances(alliances, 'totalIncome'),
    });
  }

  readRows(table, mapRow) {
    if (!table) {
      return [];
    }

    return Array.from(table.iter()).map(mapRow);
  }

  mapAlliance(row) {
    return {
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      name: String(row.name ?? ''),
      normalizedName: String(row.normalizedName ?? row.normalized_name ?? ''),
      tag: String(row.tag ?? ''),
      description: String(row.description ?? ''),
      notice: String(row.notice ?? ''),
      joinMode: String(row.joinMode ?? row.join_mode ?? 'apply'),
      leaderIdentity: this.toIdentityKey(row.leaderIdentity ?? row.leader_identity),
      memberCount: this.toNumber(row.memberCount ?? row.member_count),
      totalIncome: this.toNumber(row.totalIncome ?? row.total_income),
      seasonIncome: this.toNumber(row.seasonIncome ?? row.season_income),
      weeklyIncome: this.toNumber(
        row.weeklyIncome ?? row.weekly_income ?? row.seasonIncome ?? row.season_income,
      ),
      monthlyIncome: this.toNumber(row.monthlyIncome ?? row.monthly_income),
      dailyIncome: this.toNumber(row.dailyIncome ?? row.daily_income),
      seasonKey: String(row.seasonKey ?? row.season_key ?? ''),
      monthKey: String(row.monthKey ?? row.month_key ?? ''),
      dayKey: String(row.dayKey ?? row.day_key ?? ''),
      createdAtMs: this.toTimestampMs(row.createdAt ?? row.created_at),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  mapMember(row) {
    const role = String(row.role ?? 'trader');
    const weeklyContribution = this.toNumber(
      row.weeklyContribution ??
        row.weekly_contribution ??
        row.dailyContribution ??
        row.daily_contribution,
    );

    return {
      memberIdentity: this.toIdentityKey(row.memberIdentity ?? row.member_identity),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      username: String(row.username ?? 'wizard'),
      playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
      role,
      roleRank: this.getRoleRank(role),
      joinedAtMs: this.toTimestampMs(row.joinedAt ?? row.joined_at),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
      totalContribution: this.toNumber(row.totalContribution ?? row.total_contribution),
      dailyContribution: weeklyContribution,
      weeklyContribution,
      dayKey: String(row.dayKey ?? row.day_key ?? ''),
    };
  }

  mapApplication(row) {
    return {
      applicationKey: String(row.applicationKey ?? row.application_key ?? ''),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      applicantIdentity: this.toIdentityKey(
        row.applicantIdentity ?? row.applicant_identity,
      ),
      username: String(row.username ?? 'wizard'),
      playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
      createdAtMs: this.toTimestampMs(row.createdAt ?? row.created_at),
    };
  }

  mapQuest(row) {
    const target = this.toNumber(row.target);
    const progress = this.toNumber(row.progress);
    const questId = String(row.questId ?? row.quest_id ?? '');
    const questType = String(row.questType ?? row.quest_type ?? '');

    return {
      questKey: String(row.questKey ?? row.quest_key ?? ''),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      dayKey: String(row.dayKey ?? row.day_key ?? ''),
      questId,
      label: String(row.label ?? ''),
      questType,
      itemKey: this.getQuestItemKey(questId, questType),
      target,
      progress,
      progressRatio: target > 0 ? Math.min(progress / target, 1) : 0,
      minContribution: this.toNumber(row.minContribution ?? row.min_contribution),
      crystalReward: this.toNumber(row.crystalReward ?? row.crystal_reward),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  getQuestItemKey(questId, questType) {
    if (questType !== ITEM_FILL_QUEST_TYPE || !questId.startsWith(ITEM_FILL_QUEST_PREFIX)) {
      return '';
    }

    return questId.slice(ITEM_FILL_QUEST_PREFIX.length);
  }

  mapContribution(row) {
    return {
      contributionKey: String(row.contributionKey ?? row.contribution_key ?? ''),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      dayKey: String(row.dayKey ?? row.day_key ?? ''),
      questId: String(row.questId ?? row.quest_id ?? ''),
      contributorIdentity: this.toIdentityKey(
        row.contributorIdentity ?? row.contributor_identity,
      ),
      username: String(row.username ?? 'wizard'),
      contribution: this.toNumber(row.contribution),
      updatedAtMs: this.toTimestampMs(row.updatedAt ?? row.updated_at),
    };
  }

  mapChat(row) {
    return {
      id: this.toId(row.messageId ?? row.message_id),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      allianceTag: String(row.allianceTag ?? row.alliance_tag ?? ''),
      senderIdentity: this.toIdentityKey(row.senderIdentity ?? row.sender_identity),
      username: String(row.username ?? 'wizard'),
      playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
      body: String(row.body ?? ''),
      sentAtMs: this.toTimestampMs(row.sentAt ?? row.sent_at),
    };
  }

  mapReward(row) {
    return {
      rewardKey: String(row.rewardKey ?? row.reward_key ?? ''),
      recipientIdentity: this.toIdentityKey(
        row.recipientIdentity ?? row.recipient_identity,
      ),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      allianceName: String(row.allianceName ?? row.alliance_name ?? ''),
      questId: String(row.questId ?? row.quest_id ?? ''),
      questLabel: String(row.questLabel ?? row.quest_label ?? ''),
      dayKey: String(row.dayKey ?? row.day_key ?? ''),
      crystalReward: this.toNumber(row.crystalReward ?? row.crystal_reward),
      claimedAtMs: this.toTimestampMs(row.claimedAt ?? row.claimed_at),
      collected: Boolean(row.collected ?? false),
    };
  }

  getQuestClaimKey(questId, dayKey) {
    return `${String(dayKey ?? '')}:${String(questId ?? '')}`;
  }

  rankAlliances(alliances, valueKey) {
    return [...alliances]
      .sort((left, right) => {
        if (right[valueKey] !== left[valueKey]) {
          return right[valueKey] - left[valueKey];
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, TOP_ALLIANCE_LIMIT)
      .map((alliance, index) => ({
        ...alliance,
        rank: index + 1,
      }));
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    this.onSnapshot?.(snapshot);
  }

  getRoleRank(role) {
    return ROLE_RANK[role] ?? ROLE_RANK.trader;
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

  toIdentityKey(identity) {
    return this.toId(identity);
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

  toNumber(value) {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number.isFinite(value) ? Number(value) : 0;
  }

  toPlayerLevel(value, fallback = 1) {
    const playerLevel = Math.floor(this.toNumber(value));

    if (!Number.isFinite(playerLevel) || playerLevel < 1) {
      return fallback;
    }

    return playerLevel;
  }
}

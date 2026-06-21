import { normalizePlayerCharacter } from '../../../player/playerCharacters.js';
import { normalizeTradeAllianceTagColor } from '../../../shared/tradeAllianceTagColors.js';

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
const OVERVIEW_QUERY = 'SELECT * FROM own_trade_alliance_overview';
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
    this.publicDataActive = false;
    this.questDataActive = false;
    this.tables = {};
    this.coreSubscriptions = [];
    this.publicSubscriptions = [];
    this.questSubscriptions = [];
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
      overview: this.findTable('ownTradeAllianceOverview', 'own_trade_alliance_overview'),
      alliances: alliances.table,
      members: members.table,
      applications: applications.table,
      quests: quests.table,
      contributions: contributions.table,
      chat: this.findTable('ownTradeAllianceChat', 'own_trade_alliance_chat'),
      rewards: this.findTable('ownTradeAllianceRewardInbox', 'own_trade_alliance_reward_inbox'),
    };
    this.queries = {
      overview: OVERVIEW_QUERY,
      alliances: alliances.query,
      members: members.query,
      applications: applications.query,
      quests: quests.query,
      contributions: contributions.query,
    };

    if (!this.tables.overview && !this.tables.chat && !this.tables.rewards) {
      this.publish({ ...EMPTY_SNAPSHOT });
      return;
    }

    this.bindTable(this.tables.overview);
    this.bindTable(this.tables.chat);
    this.bindTable(this.tables.rewards);

    this.coreSubscriptions = [
      this.tables.overview ? this.subscribeQuery(this.queries.overview) : null,
      this.tables.chat ? this.subscribeQuery(CHAT_QUERY) : null,
      this.tables.rewards ? this.subscribeQuery(REWARDS_QUERY) : null,
    ].filter(Boolean);
    this.reconcilePublicDataSubscriptions();
    this.reconcileQuestDataSubscriptions();
    this.publishFromTables();
  }

  disconnect() {
    this.unbindTable(this.tables.overview);
    this.unbindTable(this.tables.chat);
    this.unbindTable(this.tables.rewards);
    this.teardownPublicDataSubscriptions();
    this.teardownQuestDataSubscriptions();

    for (const subscription of this.coreSubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.connection = null;
    this.identityKey = '';
    this.publicDataActive = false;
    this.questDataActive = false;
    this.tables = {};
    this.queries = {};
    this.coreSubscriptions = [];
    this.publicSubscriptions = [];
    this.questSubscriptions = [];
    this.publish({ ...EMPTY_SNAPSHOT });
  }

  getSnapshot() {
    return this.snapshot;
  }

  setPublicDataActive(active = true) {
    this.publicDataActive = Boolean(active);
    this.reconcilePublicDataSubscriptions();
    this.reconcileQuestDataSubscriptions();
    this.publishFromTables();
  }

  setQuestDataActive(active = true) {
    this.questDataActive = Boolean(active);
    this.reconcileQuestDataSubscriptions();
    this.publishFromTables();
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
    if (!query) {
      return null;
    }

    return this.connection
      ?.subscriptionBuilder()
      .onApplied(() => this.publishFromTables())
      .onError(() => this.publish({ ...EMPTY_SNAPSHOT }))
      .subscribe(query);
  }

  reconcilePublicDataSubscriptions() {
    if (!this.connection) {
      return;
    }

    if (!this.publicDataActive) {
      this.teardownPublicDataSubscriptions();
      return;
    }

    if (this.publicSubscriptions.length > 0) {
      return;
    }

    this.bindTable(this.tables.alliances);
    this.bindTable(this.tables.members);
    this.bindTable(this.tables.applications);

    this.publicSubscriptions = [
      this.tables.alliances ? this.subscribeQuery(this.queries.alliances) : null,
      this.tables.members ? this.subscribeQuery(this.queries.members) : null,
      this.tables.applications ? this.subscribeQuery(this.queries.applications) : null,
    ].filter(Boolean);
  }

  reconcileQuestDataSubscriptions() {
    if (!this.connection) {
      return;
    }

    if (!this.shouldReadQuestData()) {
      this.teardownQuestDataSubscriptions();
      return;
    }

    if (this.questSubscriptions.length > 0) {
      return;
    }

    this.bindTable(this.tables.quests);
    this.bindTable(this.tables.contributions);

    this.questSubscriptions = [
      this.tables.quests ? this.subscribeQuery(this.queries.quests) : null,
      this.tables.contributions ? this.subscribeQuery(this.queries.contributions) : null,
    ].filter(Boolean);
  }

  teardownPublicDataSubscriptions() {
    this.unbindTable(this.tables.alliances);
    this.unbindTable(this.tables.members);
    this.unbindTable(this.tables.applications);

    for (const subscription of this.publicSubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.publicSubscriptions = [];
  }

  teardownQuestDataSubscriptions() {
    this.unbindTable(this.tables.quests);
    this.unbindTable(this.tables.contributions);

    for (const subscription of this.questSubscriptions) {
      if (!subscription.isEnded?.()) {
        subscription.unsubscribe();
      }
    }

    this.questSubscriptions = [];
  }

  shouldReadQuestData() {
    return this.publicDataActive || this.questDataActive;
  }

  publishFromTables() {
    const overview = this.readFirstRow(this.tables.overview, (row) => this.mapOverview(row));
    const alliances = this.publicDataActive
      ? this.readRows(this.tables.alliances, (row) => this.mapAlliance(row))
          .filter((alliance) => alliance.allianceId)
          .sort((left, right) => left.name.localeCompare(right.name))
      : [];
    const members = this.publicDataActive
      ? this.readRows(this.tables.members, (row) => this.mapMember(row))
          .filter((member) => member.memberIdentity && member.allianceId)
          .sort((left, right) => {
            if (left.roleRank !== right.roleRank) {
              return right.roleRank - left.roleRank;
            }

            return left.joinedAtMs - right.joinedAtMs;
          })
      : [];
    const applications = this.publicDataActive
      ? this.readRows(this.tables.applications, (row) => this.mapApplication(row)).sort(
          (left, right) => left.createdAtMs - right.createdAtMs,
        )
      : [];
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
    const quests = this.shouldReadQuestData()
      ? this.readRows(this.tables.quests, (row) => {
          const quest = this.mapQuest(row);
          return {
            ...quest,
            claimed: claimedQuestKeys.has(this.getQuestClaimKey(quest.questId, quest.dayKey)),
          };
        }).sort((left, right) => {
          if (left.dayKey !== right.dayKey) {
            return right.dayKey.localeCompare(left.dayKey);
          }

          return left.questId.localeCompare(right.questId);
      })
      : [];
    const contributions = this.shouldReadQuestData()
      ? this.readRows(this.tables.contributions, (row) => this.mapContribution(row))
      : [];
    const allianceChatMessages = this.readRows(this.tables.chat, (row) => this.mapChat(row))
      .filter((message) => message.body)
      .sort((left, right) => {
        if (left.sentAtMs !== right.sentAtMs) {
          return left.sentAtMs - right.sentAtMs;
        }

        return left.id.localeCompare(right.id);
      })
      .slice(-MESSAGE_LIMIT);
    const ownMember = overview?.ownMember ?? null;
    const ownAlliance = overview?.ownAlliance ?? null;
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

  readFirstRow(table, mapRow) {
    if (!table) {
      return null;
    }

    for (const row of table.iter()) {
      return mapRow(row);
    }

    return null;
  }

  mapOverview(row) {
    const ownMember = {
      memberIdentity: this.toIdentityKey(row.memberIdentity ?? row.member_identity),
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      username: String(row.username ?? 'wizard'),
      playerLevel: this.toPlayerLevel(row.playerLevel ?? row.player_level),
      role: String(row.role ?? 'trader'),
      roleRank: this.getRoleRank(String(row.role ?? 'trader')),
      joinedAtMs: this.toTimestampMs(row.joinedAt ?? row.joined_at),
      updatedAtMs: this.toTimestampMs(row.memberUpdatedAt ?? row.member_updated_at),
      totalContribution: this.toNumber(row.totalContribution ?? row.total_contribution),
      dailyContribution: this.toNumber(row.dailyContribution ?? row.daily_contribution),
      weeklyContribution: this.toNumber(row.dailyContribution ?? row.daily_contribution),
      dayKey: String(row.memberDayKey ?? row.member_day_key ?? ''),
    };

    return {
      ownMember,
      ownAlliance: {
        allianceId: this.toId(row.allianceId ?? row.alliance_id),
        name: String(row.name ?? ''),
        normalizedName: String(row.normalizedName ?? row.normalized_name ?? ''),
        tag: String(row.tag ?? ''),
        tagColor: normalizeTradeAllianceTagColor(row.tagColor ?? row.tag_color),
        description: String(row.description ?? ''),
        notice: String(row.notice ?? ''),
        joinMode: String(row.joinMode ?? row.join_mode ?? 'apply'),
        leaderIdentity: this.toIdentityKey(row.leaderIdentity ?? row.leader_identity),
        memberCount: this.toNumber(row.memberCount ?? row.member_count),
        totalIncome: this.toNumber(row.totalIncome ?? row.total_income),
        seasonIncome: this.toNumber(row.seasonIncome ?? row.season_income),
        weeklyIncome: this.toNumber(row.seasonIncome ?? row.season_income),
        monthlyIncome: this.toNumber(row.monthlyIncome ?? row.monthly_income),
        dailyIncome: this.toNumber(row.dailyIncome ?? row.daily_income),
        seasonKey: String(row.seasonKey ?? row.season_key ?? ''),
        monthKey: String(row.monthKey ?? row.month_key ?? ''),
        dayKey: String(row.dayKey ?? row.day_key ?? ''),
        createdAtMs: this.toTimestampMs(row.createdAt ?? row.created_at),
        updatedAtMs: this.toTimestampMs(row.allianceUpdatedAt ?? row.alliance_updated_at),
      },
    };
  }

  mapAlliance(row) {
    return {
      allianceId: this.toId(row.allianceId ?? row.alliance_id),
      name: String(row.name ?? ''),
      normalizedName: String(row.normalizedName ?? row.normalized_name ?? ''),
      tag: String(row.tag ?? ''),
      tagColor: normalizeTradeAllianceTagColor(row.tagColor ?? row.tag_color),
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
      allianceTagColor: normalizeTradeAllianceTagColor(
        row.allianceTagColor ?? row.alliance_tag_color,
      ),
      senderIdentity: this.toIdentityKey(row.senderIdentity ?? row.sender_identity),
      username: String(row.username ?? 'wizard'),
      character: normalizePlayerCharacter(
        row.character ?? row.playerCharacter ?? row.player_character,
      ),
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

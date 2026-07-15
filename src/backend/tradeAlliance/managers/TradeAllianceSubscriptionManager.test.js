import { describe, expect, it } from 'vitest';

import { TradeAllianceSubscriptionManager } from './TradeAllianceSubscriptionManager.js';

function createTable(rows = []) {
  return {
    iter: () => rows[Symbol.iterator](),
  };
}

function createObservableTable(rows = []) {
  const handlers = {
    insert: new Set(),
    update: new Set(),
    delete: new Set(),
  };

  return {
    iter: () => rows[Symbol.iterator](),
    onInsert: (handler) => handlers.insert.add(handler),
    onUpdate: (handler) => handlers.update.add(handler),
    onDelete: (handler) => handlers.delete.add(handler),
    removeOnInsert: (handler) => handlers.insert.delete(handler),
    removeOnUpdate: (handler) => handlers.update.delete(handler),
    removeOnDelete: (handler) => handlers.delete.delete(handler),
    handlerCount: () =>
      handlers.insert.size + handlers.update.size + handlers.delete.size,
  };
}

function createConnection(db) {
  return {
    db,
    subscriptionBuilder: () => {
      const builder = {
        applied: () => {},
        error: () => {},
        onApplied(callback) {
          this.applied = callback;
          return this;
        },
        onError(callback) {
          this.error = callback;
          return this;
        },
        subscribe() {
          this.applied();
          return {
            ended: false,
            isEnded() {
              return this.ended;
            },
            unsubscribe() {
              this.ended = true;
            },
          };
        },
      };

      return builder;
    },
  };
}

function createOverviewRow() {
  return {
    memberIdentity: 'self',
    allianceId: 'alliance-1',
    username: 'wizard',
    playerLevel: 1,
    role: 'tradeMaster',
    joinedAt: 1,
    memberUpdatedAt: 1,
    totalContribution: 0,
    dailyContribution: 0,
    memberDayKey: '2026-W24',
    name: 'All Seeing Void',
    normalizedName: 'all seeing void',
    tag: 'VOID',
    tagColor: 'violet',
    description: '',
    notice: '',
    joinMode: 'apply',
    leaderIdentity: 'self',
    memberCount: 1,
    totalIncome: 0,
    seasonIncome: 0,
    createdAt: 1,
    allianceUpdatedAt: 1,
    seasonKey: '2026-W24',
    dayKey: '2026-W24',
    dailyIncome: 0,
    monthlyIncome: 0,
    monthKey: '2026-M06',
  };
}

describe('TradeAllianceSubscriptionManager', () => {
  it('marks quests claimed from own reward history rows', () => {
    const manager = new TradeAllianceSubscriptionManager();

    manager.identityKey = 'self';
    manager.publicDataActive = true;
    manager.tables = {
      overview: createTable([
        createOverviewRow(),
      ]),
      alliances: createTable([
        {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
          tag: 'VOID',
          tag_color: 'violet',
          joinMode: 'apply',
        },
      ]),
      members: createTable([
        {
          allianceId: 'alliance-1',
          memberIdentity: 'self',
          username: 'wizard',
          role: 'tradeMaster',
        },
      ]),
      applications: createTable(),
      quests: createTable([
        {
          questKey: '2026-W24:alliance-1:allianceIncomeEasy',
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeEasy',
          label: 'small caravan',
          questType: 'allianceIncome',
          target: 500,
          progress: 500,
          minContribution: 25,
          crystalReward: 1,
        },
      ]),
      contributions: createTable(),
      chat: createTable([
        {
          messageId: 'message-1',
          allianceId: 'alliance-1',
          allianceTag: 'VOID',
          allianceTagColor: 'violet',
          senderIdentity: 'self',
          username: 'wizard',
          character: 'rowan',
          playerLevel: 3,
          body: 'alliance hello',
          sentAt: 1,
        },
      ]),
      rewards: createTable([
        {
          rewardKey: '2026-W24:allianceIncomeEasy:self',
          recipientIdentity: 'self',
          allianceId: 'alliance-1',
          allianceName: 'All Seeing Void',
          questId: 'allianceIncomeEasy',
          questLabel: 'small caravan',
          dayKey: '2026-W24',
          crystalReward: 1,
          claimedAt: 1,
          collected: true,
        },
      ]),
    };

    manager.publishFromTables();

    expect(manager.getSnapshot().quests[0]).toMatchObject({
      questId: 'allianceIncomeEasy',
      claimed: true,
    });
    expect(manager.getSnapshot().rewardInbox[0]).toMatchObject({
      rewardKey: '2026-W24:allianceIncomeEasy:self',
      collected: true,
    });
    expect(manager.getSnapshot().ownAlliance).toMatchObject({
      tag: 'VOID',
      tagColor: 'violet',
    });
    expect(manager.getSnapshot().allianceChatMessages[0]).toMatchObject({
      username: 'wizard',
      character: 'rowan',
      body: 'alliance hello',
    });
  });

  it('reads quest status without full public alliance data', () => {
    const manager = new TradeAllianceSubscriptionManager();

    manager.identityKey = 'self';
    manager.questDataActive = true;
    manager.tables = {
      overview: createTable([createOverviewRow()]),
      alliances: createTable([
        {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
        },
      ]),
      members: createTable([
        {
          allianceId: 'alliance-1',
          memberIdentity: 'self',
        },
      ]),
      applications: createTable(),
      quests: createTable([
        {
          questKey: '2026-W24:alliance-1:allianceIncomeEasy',
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeEasy',
          label: 'small caravan',
          questType: 'allianceIncome',
          target: 500,
          progress: 500,
          minContribution: 25,
          crystalReward: 1,
        },
      ]),
      contributions: createTable([
        {
          contributionKey: '2026-W24:alliance-1:allianceIncomeEasy:self',
          allianceId: 'alliance-1',
          dayKey: '2026-W24',
          questId: 'allianceIncomeEasy',
          contributorIdentity: 'self',
          username: 'wizard',
          contribution: 25,
          updatedAt: 1,
        },
      ]),
      chat: createTable(),
      rewards: createTable(),
    };

    manager.publishFromTables();

    expect(manager.getSnapshot()).toMatchObject({
      alliances: [],
      members: [],
      applications: [],
      ownAlliance: {
        allianceId: 'alliance-1',
      },
      quests: [
        {
          questId: 'allianceIncomeEasy',
          progress: 500,
        },
      ],
      contributions: [
        {
          questId: 'allianceIncomeEasy',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
    });
  });

  it('keeps a known own alliance after a subscription error', () => {
    let onError = null;
    const manager = new TradeAllianceSubscriptionManager();

    manager.tables = {
      overview: createTable([createOverviewRow()]),
      alliances: createTable(),
      members: createTable(),
      applications: createTable(),
      quests: createTable(),
      contributions: createTable(),
      chat: createTable(),
      rewards: createTable(),
    };
    manager.connection = {
      subscriptionBuilder: () => ({
        onApplied() {
          return this;
        },
        onError(callback) {
          onError = callback;
          return this;
        },
        subscribe() {
          return null;
        },
      }),
    };

    manager.publishFromTables();
    manager.subscribeQuery('SELECT * FROM trade_alliance_member_snapshot');
    onError();

    expect(manager.getSnapshot()).toMatchObject({
      connected: true,
      ownMember: {
        memberIdentity: 'self',
        role: 'tradeMaster',
      },
      ownAlliance: {
        allianceId: 'alliance-1',
        tag: 'VOID',
      },
    });
  });

  it('keeps quest table listeners while public alliance data is released', () => {
    const tables = {
      ownTradeAllianceOverview: createObservableTable([createOverviewRow()]),
      ownTradeAllianceChat: createObservableTable(),
      ownTradeAllianceRewardInbox: createObservableTable(),
      tradeAllianceSnapshot: createObservableTable(),
      tradeAllianceMemberSnapshot: createObservableTable(),
      tradeAllianceApplicationSnapshot: createObservableTable(),
      tradeAllianceQuestProgressSnapshot: createObservableTable(),
      tradeAllianceQuestContributionSnapshot: createObservableTable(),
    };
    const manager = new TradeAllianceSubscriptionManager();

    manager.connect(createConnection(tables), 'self');
    manager.setQuestDataActive(true);

    expect(tables.tradeAllianceQuestProgressSnapshot.handlerCount()).toBe(3);
    expect(tables.tradeAllianceQuestContributionSnapshot.handlerCount()).toBe(3);

    manager.setPublicDataActive(true);
    manager.setPublicDataActive(false);

    expect(tables.tradeAllianceQuestProgressSnapshot.handlerCount()).toBe(3);
    expect(tables.tradeAllianceQuestContributionSnapshot.handlerCount()).toBe(3);

    manager.setQuestDataActive(false);

    expect(tables.tradeAllianceQuestProgressSnapshot.handlerCount()).toBe(0);
    expect(tables.tradeAllianceQuestContributionSnapshot.handlerCount()).toBe(0);
  });
});

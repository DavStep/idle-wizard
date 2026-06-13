import { describe, expect, it } from 'vitest';

import { TradeAllianceSubscriptionManager } from './TradeAllianceSubscriptionManager.js';

function createTable(rows = []) {
  return {
    iter: () => rows[Symbol.iterator](),
  };
}

describe('TradeAllianceSubscriptionManager', () => {
  it('marks quests claimed from own reward history rows', () => {
    const manager = new TradeAllianceSubscriptionManager();

    manager.identityKey = 'self';
    manager.tables = {
      alliances: createTable([
        {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
          tag: 'VOID',
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
      chat: createTable(),
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
  });
});

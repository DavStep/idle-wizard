// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkshopTradeAllianceManager } from './WorkshopTradeAllianceManager.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('WorkshopTradeAllianceManager styles', () => {
  it('keeps the tabbed popup height fixed while tab content changes', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const dialogRule = baseCss.match(
      /\.style-dialog\.workshop-page__trade-alliance-dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.workshop-page__trade-alliance-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabRuleBodies = [
      ...baseCss.matchAll(
        /\.workshop-page__trade-alliance-panel\[data-active-tab="[^"]+"\][^{]*\{(?<body>[^}]*)\}/g,
      ),
    ]
      .map((match) => match.groups?.body ?? '')
      .join('\n');

    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).toMatch(/\bheight:\s*var\(--style-tabbed-dialog-content-height\);/);
    expect(contentRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(contentRule).toMatch(/\bmin-height:\s*0;/);
    expect(contentRule).not.toMatch(/\bheight:\s*auto;/);
    expect(tabRuleBodies).not.toMatch(/\bheight:\s*auto;/);
    expect(tabRuleBodies).not.toMatch(/\bmax-height:/);
  });

  it('marks the Workshop alliance button when a quest reward can be claimed', () => {
    const snapshot = {
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'All Seeing Void',
        tag: 'VOID',
        memberCount: 1,
        seasonIncome: 0,
        dailyIncome: 0,
        seasonKey: '2026-W24',
      },
      ownMember: {
        memberIdentity: 'self',
        role: 'tradeMaster',
      },
      quests: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          label: 'small caravan',
          target: 500,
          progress: 500,
          minContribution: 25,
          crystalReward: 1,
        },
      ],
      contributions: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          contributorIdentity: 'self',
          contribution: 25,
        },
      ],
      rewardInbox: [],
    };
    const tradeAllianceFacade = {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listener(snapshot);
        return () => {};
      },
    };
    const manager = new WorkshopTradeAllianceManager({ tradeAllianceFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    document.body.append(parent, popupParent);
    manager.mount(parent, popupParent);

    expect(
      parent.querySelector('.workshop-page__trade-alliance-button')?.dataset.notification,
    ).toBe('true');

    manager.unmount();
  });
});

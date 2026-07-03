// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkshopTradeAllianceManager } from './WorkshopTradeAllianceManager.js';

afterEach(() => {
  document.body.replaceChildren();
});

function createTradeAllianceFacadeFake(initialSnapshot = {}) {
  let snapshot = initialSnapshot;
  const listeners = new Set();

  return {
    getSnapshot: () => snapshot,
    emit(nextSnapshot = snapshot) {
      snapshot = nextSnapshot;
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
  };
}

function mountManager(tradeAllianceFacade) {
  const manager = new WorkshopTradeAllianceManager({ tradeAllianceFacade });
  const parent = document.createElement('div');
  const popupParent = document.createElement('div');

  document.body.append(parent, popupParent);
  manager.mount(parent, popupParent);
  parent
    .querySelector('.workshop-page__trade-alliance-button')
    ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  return { manager, parent, popupParent };
}

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

  it('renders a tag-colored layered banner icon for the Workshop alliance button', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'All Seeing Void',
        tag: 'VOID',
        tagColor: 'blue',
        memberCount: 1,
        seasonIncome: 0,
        dailyIncome: 0,
        seasonKey: '2026-W24',
      },
      ownMember: {
        memberIdentity: 'self',
        role: 'tradeMaster',
      },
      quests: [],
      contributions: [],
      rewardInbox: [],
    });
    const manager = new WorkshopTradeAllianceManager({ tradeAllianceFacade });
    const parent = document.createElement('div');
    const popupParent = document.createElement('div');

    document.body.append(parent, popupParent);
    manager.mount(parent, popupParent);

    const root = parent.querySelector('.workshop-page__trade-alliance');
    const button = parent.querySelector('.workshop-page__trade-alliance-button');
    const iconFrame = button?.querySelector(
      '.workshop-page__trade-alliance-button-icon-frame',
    );

    expect(root?.classList.contains('workshop-page__panel-button')).toBe(true);
    expect(root?.dataset.panelSide).toBe('right');
    expect(button?.textContent).toBe('alliance');
    expect(button?.getAttribute('aria-label')).toBe('open alliance All Seeing Void');
    expect(
      button?.querySelector('.workshop-page__trade-alliance-button-icon-cloth'),
    ).not.toBeNull();
    expect(
      button
        ?.querySelector('.workshop-page__trade-alliance-button-icon')
        ?.getAttribute('src'),
    ).toContain('icon-alliance-banner-base.webp');
    expect(
      iconFrame?.style.getPropertyValue('--workshop-trade-alliance-banner-color'),
    ).toBe('var(--style-alliance-tag-blue)');
    expect(
      iconFrame?.style.getPropertyValue('--workshop-trade-alliance-banner-mask'),
    ).toContain('icon-alliance-banner-cloth-mask.webp');

    tradeAllianceFacade.emit({
      connected: true,
      ownAlliance: null,
      quests: [],
      contributions: [],
      rewardInbox: [],
    });

    expect(button?.getAttribute('aria-label')).toBe('open trade alliance');
    expect(
      iconFrame?.style.getPropertyValue('--workshop-trade-alliance-banner-color'),
    ).toBe('var(--style-alliance-tag-ink)');

    manager.unmount();
  });

  it('renders quest crystal rewards through resource icon labels', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
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
      ownRole: 'tradeMaster',
      quests: [
        {
          allianceId: 'alliance-1',
          questId: 'allianceIncomeEasy',
          dayKey: '2026-W24',
          label: 'small caravan',
          questType: 'allianceIncome',
          itemKey: '',
          target: 500,
          progress: 125,
          progressRatio: 0.25,
          minContribution: 25,
          crystalReward: 2,
        },
      ],
      contributions: [],
      rewardInbox: [],
    });
    const { popupParent, manager } = mountManager(tradeAllianceFacade);
    const popup = popupParent.querySelector('.workshop-page__trade-alliance-popup');
    const questsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')].find(
      (button) => button.textContent === 'quests',
    );

    questsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rewardValue = popup.querySelector(
      '[data-quest-id="allianceIncomeEasy"] .workshop-page__trade-alliance-row.is-muted .row_val',
    );
    const crystalLabel = rewardValue?.querySelector('.style-resource-label--crystal');

    expect(rewardValue?.dataset.resourceColor).toBe('crystal');
    expect(crystalLabel).not.toBeNull();
    expect(crystalLabel?.querySelector('.style-resource-label__amount')?.textContent).toBe('2');
    expect(crystalLabel?.querySelector('.style-resource-label__icon')).not.toBeNull();

    manager.unmount();
  });

  it('keeps browse search focused while alliance snapshots refresh', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance: null,
      alliances: [
        {
          allianceId: 'alliance-1',
          name: 'Tap Guild',
          tag: 'TAP',
          description: 'test',
          joinMode: 'open',
          memberCount: 1,
          seasonIncome: 0,
        },
      ],
    });
    const { popupParent } = mountManager(tradeAllianceFacade);
    const popup = popupParent.querySelector('.workshop-page__trade-alliance-popup');
    const search = popup.querySelector('.workshop-page__trade-alliance-search');

    search.focus();
    search.value = 'tap';
    search.setSelectionRange(3, 3);
    search.dispatchEvent(new window.Event('input', { bubbles: true }));

    tradeAllianceFacade.emit({
      connected: true,
      ownAlliance: null,
      alliances: [
        {
          allianceId: 'alliance-1',
          name: 'Tap Guild',
          tag: 'TAP',
          description: 'test',
          joinMode: 'open',
          memberCount: 2,
          seasonIncome: 5,
        },
      ],
    });

    const refreshedSearch = popup.querySelector('.workshop-page__trade-alliance-search');
    expect(refreshedSearch.value).toBe('tap');
    expect(document.activeElement).toBe(refreshedSearch);
    expect(refreshedSearch.selectionStart).toBe(3);
    expect(refreshedSearch.selectionEnd).toBe(3);
  });

  it('keeps create form edits focused while alliance snapshots refresh', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance: null,
      alliances: [],
    });
    const { popupParent } = mountManager(tradeAllianceFacade);
    const popup = popupParent.querySelector('.workshop-page__trade-alliance-popup');
    const createTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')].find(
      (button) => button.textContent === 'create',
    );

    createTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const nameInput = popup.querySelector('input[name="name"]');
    nameInput.focus();
    nameInput.value = 'Tap Guild';
    nameInput.setSelectionRange(4, 4);
    nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    popup.querySelector('input[name="tag"]').value = 'TAP';
    popup.querySelector('input[name="tag"]').dispatchEvent(new window.Event('input', { bubbles: true }));

    tradeAllianceFacade.emit({
      connected: true,
      ownAlliance: null,
      alliances: [
        {
          allianceId: 'alliance-1',
          name: 'Other Guild',
          tag: 'OTH',
          description: 'test',
          joinMode: 'open',
          memberCount: 3,
          seasonIncome: 10,
        },
      ],
    });

    const refreshedNameInput = popup.querySelector('input[name="name"]');
    expect(refreshedNameInput.value).toBe('Tap Guild');
    expect(popup.querySelector('input[name="tag"]')?.value).toBe('TAP');
    expect(document.activeElement).toBe(refreshedNameInput);
    expect(refreshedNameInput.selectionStart).toBe(4);
    expect(refreshedNameInput.selectionEnd).toBe(4);
  });

  it('keeps settings form edits focused while alliance snapshots refresh', () => {
    const ownAlliance = {
      allianceId: 'alliance-1',
      name: 'All Seeing Void',
      tag: 'VOID',
      tagColor: 'ink',
      description: 'yes',
      notice: '',
      joinMode: 'apply',
      memberCount: 1,
      seasonIncome: 0,
      dailyIncome: 0,
      seasonKey: '0',
    };
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance,
      ownMember: {
        memberIdentity: 'self',
        role: 'tradeMaster',
      },
      ownRole: 'tradeMaster',
      canEditSettings: true,
      quests: [],
      contributions: [],
      rewardInbox: [],
    });
    const { popupParent } = mountManager(tradeAllianceFacade);
    const popup = popupParent.querySelector('.workshop-page__trade-alliance-popup');
    const settingsTab = [...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button')].find(
      (button) => button.textContent === 'settings',
    );

    settingsTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const nameInput = popup.querySelector('input[name="name"]');
    nameInput.focus();
    nameInput.value = 'Tap Void';
    nameInput.setSelectionRange(3, 3);
    nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    tradeAllianceFacade.emit({
      connected: true,
      ownAlliance: {
        ...ownAlliance,
        memberCount: 2,
      },
      ownMember: {
        memberIdentity: 'self',
        role: 'tradeMaster',
      },
      ownRole: 'tradeMaster',
      canEditSettings: true,
      quests: [],
      contributions: [],
      rewardInbox: [],
    });

    const refreshedNameInput = popup.querySelector('input[name="name"]');
    expect(refreshedNameInput.value).toBe('Tap Void');
    expect(document.activeElement).toBe(refreshedNameInput);
    expect(refreshedNameInput.selectionStart).toBe(3);
    expect(refreshedNameInput.selectionEnd).toBe(3);
  });
});

// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('marks the Workshop alliance button when a manageable join request is pending', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'All Seeing Void',
        tag: 'VOID',
      },
      ownMember: {
        memberIdentity: 'self',
        role: 'factor',
      },
      canManageApplications: true,
      applications: [
        {
          applicationKey: 'alliance-1:applicant-1',
          allianceId: 'alliance-1',
          applicantIdentity: 'applicant-1',
        },
      ],
      quests: [],
    });
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

  it('renders the colored alliance flag for members and the discovery icon for solo players', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'All Seeing Void',
        tag: 'VOID',
        tagColor: 'blue',
        bannerColor: 'violet',
        emblemColor: 'white',
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
    expect(root?.classList.contains('workshop-page__panel-button')).toBe(true);
    expect(root?.dataset.panelSide).toBe('left');
    expect(button?.textContent).toBe('Alliance');
    expect(button?.getAttribute('aria-label')).toBe('open alliance All Seeing Void');
    const icon = button?.querySelector('.workshop-page__trade-alliance-button-icon');
    const flag = button?.querySelector('.workshop-page__trade-alliance-button-flag');
    expect(icon?.hidden).toBe(true);
    expect(flag?.hidden).toBe(false);
    expect(flag?.querySelector('.workshop-page__trade-alliance-button-flag-base')?.getAttribute('src')).toContain('icon-alliance-banner-base.png');
    expect(flag?.querySelector('.workshop-page__trade-alliance-button-flag-cloth')?.style.backgroundColor).toBe('rgb(103, 73, 141)');
    expect(flag?.querySelector('.workshop-page__trade-alliance-button-flag-emblem')?.style.backgroundColor).toBe('rgb(255, 249, 237)');

    tradeAllianceFacade.emit({
      connected: true,
      ownAlliance: null,
      quests: [],
      contributions: [],
      rewardInbox: [],
    });

    expect(button?.getAttribute('aria-label')).toBe('open trade alliance');
    expect(icon?.hidden).toBe(false);
    expect(flag?.hidden).toBe(true);

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
    popup
      .querySelector('input[name="tag"]')
      .dispatchEvent(new window.Event('input', { bubbles: true }));

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
    const settingsTab = [
      ...popup.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
    ].find((button) => button.textContent === 'settings');

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

  it('saves banner and emblem colors without dropping alliance profile fields', async () => {
    const updateProfile = vi.fn(async () => ({ ok: true }));
    const tradeAllianceFacade = {
      ...createTradeAllianceFacadeFake({
        connected: true,
        ownAlliance: {
          allianceId: 'alliance-1',
          name: 'All Seeing Void',
          tag: 'VOID',
          tagColor: 'violet',
          bannerColor: 'blue',
          emblemColor: 'gold',
          emblemId: 'owl',
          description: 'Patient traders.',
          notice: 'Support the route.',
          joinMode: 'apply',
          memberCount: 1,
        },
        ownMember: { memberIdentity: 'self', role: 'tradeMaster' },
        canEditSettings: true,
        members: [],
        quests: [],
      }),
      updateProfile,
    };
    const { popupParent, manager } = mountManager(tradeAllianceFacade);
    const popup = popupParent.querySelector('.workshop-page__trade-alliance-popup');
    const bannerTab = [...popup.querySelectorAll(
      '.workshop-page__trade-alliance-tab-button',
    )].find((button) => button.textContent === 'banner');
    bannerTab.click();

    const palettes = popup.querySelectorAll(
      '.workshop-page__trade-alliance-color-swatches',
    );
    palettes[0].querySelector('[data-color-id="red"]').click();
    palettes[1].querySelector('[data-color-id="white"]').click();
    const emblemOptions = popup.querySelectorAll(
      '.workshop-page__trade-alliance-emblem-option',
    );
    expect(emblemOptions).toHaveLength(16);
    const owlOption = popup.querySelector('[data-emblem-id="owl"]');
    const flameOption = popup.querySelector('[data-emblem-id="flame"]');
    expect(
      owlOption.querySelector(
        '.workshop-page__trade-alliance-emblem-option-checkmark',
      ).hidden,
    ).toBe(false);
    expect(
      flameOption.querySelector(
        '.workshop-page__trade-alliance-emblem-option-checkmark',
      ).hidden,
    ).toBe(true);
    flameOption.click();
    expect(
      owlOption.querySelector(
        '.workshop-page__trade-alliance-emblem-option-checkmark',
      ).hidden,
    ).toBe(true);
    expect(
      flameOption.querySelector(
        '.workshop-page__trade-alliance-emblem-option-checkmark',
      ).hidden,
    ).toBe(false);
    popup.querySelector('button[type="submit"]').click();
    await Promise.resolve();

    expect(updateProfile).toHaveBeenCalledWith({
      name: 'All Seeing Void',
      tag: 'VOID',
      tagColor: 'violet',
      bannerColor: 'red',
      emblemColor: 'white',
      emblemId: 'flame',
      description: 'Patient traders.',
      notice: 'Support the route.',
      joinMode: 'apply',
    });
    manager.unmount();
  });

  it('hides settings when the current alliance member cannot edit them', () => {
    const tradeAllianceFacade = createTradeAllianceFacadeFake({
      connected: true,
      ownAlliance: {
        allianceId: 'alliance-1',
        name: 'All Seeing Void',
        tag: 'VOID',
        memberCount: 2,
        seasonIncome: 0,
        dailyIncome: 0,
      },
      ownMember: {
        memberIdentity: 'self',
        role: 'trader',
      },
      canEditSettings: false,
      members: [],
      quests: [],
      contributions: [],
      rewardInbox: [],
    });
    const { popupParent, manager } = mountManager(tradeAllianceFacade);
    const tabs = [
      ...popupParent.querySelectorAll('.workshop-page__trade-alliance-tab-button'),
    ];

    expect(tabs.map((button) => button.textContent)).toEqual(['home', 'quests']);

    manager.unmount();
  });
});

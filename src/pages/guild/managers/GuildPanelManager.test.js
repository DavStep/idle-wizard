// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuildPanelManager } from './GuildPanelManager.js';

function createGuildSnapshot(overrides = {}) {
  return {
    unlocked: true,
    created: false,
    canCreate: true,
    charterCostCoin: 1500,
    currentCoin: 2000,
    ...overrides,
  };
}

function createCreatedGuildSnapshot(overrides = {}) {
  const boardRequest = {
    id: 'request-1',
    title: 'lost lantern',
    difficulty: 'easy',
    statLabel: 'wits',
    rewardText: '12 coin',
    lore: 'a village needs light.',
    expiresLabel: '12m',
  };
  const availableRequest = {
    id: 'request-2',
    title: 'old road escort',
    difficulty: 'medium',
    statLabel: 'endurance / charisma',
    rewardText: '20 coin',
    lore: 'a trader wants one honest shadow.',
    expiresLabel: '12m',
  };

  return createGuildSnapshot({
    created: true,
    profile: {
      name: 'ash hall',
      tag: 'ASH',
      color: 'red',
    },
    secretary: {
      level: 1,
      hiredCap: 1,
      boardSlots: 3,
    },
    board: [boardRequest],
    normalBoard: [boardRequest],
    eventBoard: [],
    availableRequests: [availableRequest],
    availableNormalRequests: [availableRequest],
    availableEventRequests: [],
    adventurers: [
      {
        id: 'adventurer-1',
        displayName: 'mira',
        level: 1,
        status: 'idle',
        statusLabel: 'idle',
        personalityLabel: 'steady',
      },
    ],
    applicants: [
      {
        id: 'applicant-1',
        displayName: 'orin',
        level: 1,
        status: 'idle',
        statusLabel: 'idle',
        personalityLabel: 'bold',
      },
    ],
    logs: [{ text: 'mira returns.', tone: null }],
    boardWaveLabel: '12m',
    ...overrides,
  });
}

function createGameplayFacadeFake(initialGuild = createGuildSnapshot()) {
  let snapshot = { guild: initialGuild };
  const listeners = new Set();

  return {
    createGuild: vi.fn(() => ({ ok: true })),
    postGuildRequest: vi.fn(() => ({ ok: true })),
    removeGuildRequest: vi.fn(() => ({ ok: true })),
    updateGuildProfile: vi.fn(() => ({ ok: true })),
    upgradeGuildSecretary: vi.fn(() => ({ ok: true })),
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    emitGuild(guild) {
      snapshot = { guild };
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
  };
}

function mountManager(gameplayFacade) {
  const parent = document.createElement('section');
  const popupLayer = document.createElement('section');
  const manager = new GuildPanelManager({ gameplayFacade });

  document.body.append(parent, popupLayer);
  manager.mount(parent, popupLayer);

  return { manager, parent, popupLayer };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('GuildPanelManager', () => {
  it('centers only the locked or charter box state', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { parent } = mountManager(gameplayFacade);
    const content = parent.querySelector('.guild-page__content');

    expect(content?.classList.contains('guild-page__content--centered')).toBe(true);

    gameplayFacade.emitGuild(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );

    expect(content?.classList.contains('guild-page__content--centered')).toBe(false);
  });

  it('separates created guild content into room tabs', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);

    const getTabButtons = () => [...parent.querySelectorAll('.guild-page__content-tab-button')];
    const getBoxTitles = () =>
      [...parent.querySelectorAll('.guild-page__tabpanel .style-box__title')].map(
        (title) => title.textContent,
      );

    const tabButtons = getTabButtons();
    expect(tabButtons.map((button) => button.textContent)).toEqual([
      'hall',
      'board',
      'roster',
      'log',
    ]);
    expect(tabButtons.map((button) => button.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
    const initialPanel = parent.querySelector('.guild-page__tabpanel');
    expect(initialPanel?.dataset.guildTabPanel).toBe('hall');
    expect(initialPanel?.classList.contains('style-page-scroll')).toBe(true);
    expect(initialPanel?.dataset.scrollCueProgress).toBe('inline');
    expect(getBoxTitles()).toEqual(['guild hall', 'secretary']);

    getTabButtons()
      .find((button) => button.dataset.guildTab === 'board')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.guild-page__tabpanel')?.dataset.guildTabPanel).toBe('board');
    expect(getBoxTitles()).toEqual(['request board', 'available quests']);

    getTabButtons()
      .find((button) => button.dataset.guildTab === 'adventurers')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.guild-page__tabpanel')?.dataset.guildTabPanel).toBe(
      'adventurers',
    );
    expect(getBoxTitles()).toEqual(['adventurers', 'applicants']);

    getTabButtons()
      .find((button) => button.dataset.guildTab === 'log')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.guild-page__tabpanel')?.dataset.guildTabPanel).toBe('log');
    expect(getBoxTitles()).toEqual(['guild log']);
  });

  it('keeps selected guild room tab across snapshot refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="board"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.emitGuild(
      createCreatedGuildSnapshot({
        normalBoard: [],
        board: [],
      }),
    );

    expect(parent.querySelector('.guild-page__tabpanel')?.dataset.guildTabPanel).toBe('board');
    expect(
      parent
        .querySelector('.guild-page__content-tab-button[data-guild-tab="board"]')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(parent.querySelector('.guild-page__empty-row')?.textContent).toBe('no requests');
  });

  it('shows board requests above available quests with expiry and post/remove actions', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="board"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const boxes = [...parent.querySelectorAll('.guild-page__box')];
    const boardBox = boxes.find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'request board',
    );
    const availableBox = boxes.find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'available quests',
    );
    const boardRow = boardBox?.querySelector('.guild-page__request-row');
    const availableRow = availableBox?.querySelector('.guild-page__request-row');

    expect(boardBox?.querySelector('.guild-page__row-main')?.textContent).toBe(
      'lost lantern (easy) expires 12m',
    );
    expect(boardBox?.querySelector('.guild-page__box-bottom')?.textContent).toBe(
      'new available 12m',
    );
    expect(boardRow?.querySelector('.guild-page__row-action')?.textContent).toBe('remove');
    expect(availableBox?.querySelector('.guild-page__row-main')?.textContent).toBe(
      'old road escort (medium) expires 12m',
    );
    expect(availableBox?.querySelector('.guild-page__box-bottom')?.textContent).toBe('new 12m');
    expect(availableRow?.querySelector('.guild-page__row-action')?.textContent).toBe('post');

    boardRow
      ?.querySelector('.guild-page__row-action')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    availableRow
      ?.querySelector('.guild-page__row-action')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.removeGuildRequest).toHaveBeenCalledWith('request-1');
    expect(gameplayFacade.postGuildRequest).toHaveBeenCalledWith('request-2');
  });

  it('shows the guild tag and name as one left-aligned hall row', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);
    const hallBox = [...parent.querySelectorAll('.guild-page__box')].find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'guild hall',
    );
    const identityRow = hallBox?.querySelector('.guild-page__identity-row');

    expect(identityRow?.textContent).toBe('[ASH] ash hall');
    expect(identityRow?.querySelector('.guild-page__row-key')).toBeNull();
    expect(identityRow?.querySelector('.guild-page__row-value')).toBeNull();
    expect(identityRow?.querySelector('.workshop-page__alliance-tag')?.textContent).toBe('[ASH]');
  });

  it('moves the secretary upgrade action out of guild settings and into a secretary box', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
          next: {
            level: 2,
            costCoin: 3000,
            hiredCap: 2,
            boardSlots: 5,
          },
          canUpgrade: true,
        },
      }),
    );
    const { parent, popupLayer } = mountManager(gameplayFacade);
    const boxes = [...parent.querySelectorAll('.guild-page__box')];
    const secretaryBox = boxes.find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'secretary',
    );
    const upgradeButton = [
      ...(secretaryBox?.querySelectorAll('.guild-page__wide-button') ?? []),
    ].find((button) => button.textContent === 'upgrade secretary (3000)');

    expect(secretaryBox).not.toBeUndefined();
    expect(
      [...secretaryBox.querySelectorAll('.guild-page__row-key')].map((row) => row.textContent),
    ).toEqual(['level', 'adventurers', 'board']);
    expect(
      [...secretaryBox.querySelectorAll('.guild-page__row-value')].map((row) => row.textContent),
    ).toEqual(['1', '1 -> 2', '3 -> 5']);
    expect(upgradeButton?.disabled).toBe(false);

    upgradeButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.upgradeGuildSecretary).toHaveBeenCalledTimes(1);

    [...parent.querySelectorAll('.guild-page__wide-button')]
      .find((button) => button.textContent === 'settings')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...popupLayer.querySelectorAll('.guild-page__wide-button')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['save']);
    expect(popupLayer.textContent).not.toContain('upgrade secretary');
  });

  it('renders guild card dialog tabs as a standard tablist', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent, popupLayer } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('.guild-page__adventurer-row .guild-page__row-main')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const panel = popupLayer.querySelector('.guild-page__popup-panel');
    const tabs = popupLayer.querySelector('.guild-page__tabs');
    const tabButtons = [...popupLayer.querySelectorAll('.guild-page__tab-button')];

    expect(panel?.dataset.popupKind).toBe('adventurer');
    expect(tabs?.getAttribute('role')).toBe('tablist');
    expect(tabs?.getAttribute('aria-label')).toBe('guild card details');
    expect(tabButtons.map((button) => button.textContent)).toEqual([
      'stats',
      'life',
      'history',
    ]);
    expect(tabButtons.map((button) => button.getAttribute('role'))).toEqual([
      'tab',
      'tab',
      'tab',
    ]);
    expect(tabButtons.map((button) => button.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);

    tabButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      [...popupLayer.querySelectorAll('.guild-page__tab-button')].map((button) =>
        button.getAttribute('aria-selected'),
      ),
    ).toEqual(['false', 'true', 'false']);
  });

  it('rolls hidden adventurer attention up to the guild tab button', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        adventurers: [
          {
            id: 'adventurer-1',
            displayName: 'mira',
            level: 1,
            status: 'hospital',
            statusLabel: 'hospital',
            personalityLabel: 'steady',
          },
        ],
      }),
    );
    const { parent } = mountManager(gameplayFacade);
    const adventurersTab = parent.querySelector(
      '.guild-page__content-tab-button[data-guild-tab="adventurers"]',
    );

    expect(adventurersTab?.dataset.notification).toBe('true');
    expect(adventurersTab?.dataset.notificationTone).toBe('red');
  });

  it('places adventurer attention on the row instead of between columns', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        adventurers: [
          {
            id: 'adventurer-1',
            displayName: 'mira',
            level: 1,
            status: 'hospital',
            statusLabel: 'hospital',
            personalityLabel: 'steady',
          },
        ],
      }),
    );
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const row = parent.querySelector('.guild-page__adventurer-row');
    const main = row?.querySelector('.guild-page__row-main');

    expect(row?.dataset.notification).toBe('true');
    expect(main?.dataset.notification).toBeUndefined();
  });

  it('preserves guild charter fields across gameplay snapshot refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    popupLayer.querySelector('input[name="name"]').value = 'ash hall';
    popupLayer.querySelector('input[name="tag"]').value = 'ASH';
    popupLayer
      .querySelector('.guild-page__swatch[data-color-id="blue"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    gameplayFacade.emitGuild(createGuildSnapshot({ currentCoin: 1999 }));

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ash hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"]')?.value).toBe('blue');
    expect(
      popupLayer.querySelector('.guild-page__swatch[data-color-id="blue"]')?.getAttribute(
        'aria-checked',
      ),
    ).toBe('true');
  });

  it('keeps the active guild charter name input mounted across refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const nameInput = popupLayer.querySelector('input[name="name"]');
    nameInput.focus();
    nameInput.value = 'ash hall';
    nameInput.setSelectionRange(3, 3);
    nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    gameplayFacade.emitGuild(createGuildSnapshot({ currentCoin: 1999 }));

    const refreshedNameInput = popupLayer.querySelector('input[name="name"]');
    expect(refreshedNameInput).toBe(nameInput);
    expect(document.activeElement).toBe(nameInput);
    expect(refreshedNameInput.value).toBe('ash hall');
    expect(refreshedNameInput.selectionStart).toBe(3);
    expect(refreshedNameInput.selectionEnd).toBe(3);
  });

  it('shows a start guild notification only when the charter is affordable', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { parent } = mountManager(gameplayFacade);
    const button = parent.querySelector('.guild-page__wide-button');

    expect(parent.querySelector('.style-box__title')?.textContent).toBe('guild charter');
    expect(parent.querySelector('.guild-page__box--charter')).not.toBeNull();
    expect(parent.querySelector('.guild-page__paragraph')?.textContent).toBe(
      'establish your guild to hire adventurers, take requests, and keep a hall of your own.',
    );
    expect(button?.textContent).toBe('start guild1.5k coin');
    expect(button?.getAttribute('aria-label')).toBe('start guild for 1.5k coin');
    expect(button?.querySelector('.guild-page__charter-button-cost')?.dataset.resourceColor).toBe(
      'coin',
    );
    expect(button?.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(button?.disabled).toBe(false);
    expect(button?.dataset.notification).toBe('true');
    expect(button?.dataset.notificationTone).toBe('red');

    gameplayFacade.emitGuild(
      createGuildSnapshot({
        canCreate: false,
        currentCoin: 1499,
      }),
    );

    const updatedButton = parent.querySelector('.guild-page__wide-button');
    expect(updatedButton?.disabled).toBe(true);
    expect(updatedButton?.dataset.notification).toBeUndefined();
    expect(updatedButton?.dataset.notificationTone).toBeUndefined();
  });

  it('gives the guild charter box extra vertical room', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const charterRule = baseCss.match(
      /\.guild-page__box--charter\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const charterRowsRule = baseCss.match(
      /\.guild-page__box--charter\s+\.guild-page__rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(charterRule).toMatch(
      /\bmin-height:\s*calc\(var\(--style-row-min-height\)\s*\*\s*5\);/,
    );
    expect(charterRule).toMatch(/\bpadding-top:\s*10px;/);
    expect(charterRule).toMatch(/\bpadding-bottom:\s*10px;/);
    expect(charterRowsRule).toMatch(/\bgap:\s*8px;/);
  });

  it('centers the guild charter start button', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const charterButtonRule = baseCss.match(
      /\.style-button\.guild-page__charter-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(charterButtonRule).toMatch(/\balign-self:\s*center;/);
    expect(charterButtonRule).toMatch(/\bwidth:\s*min\(220px,\s*100%\);/);
    expect(charterButtonRule).toMatch(/\bmargin-top:\s*10px;/);
  });

  it('populates guild settings fields and keeps in-progress edits through refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ash hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"]')?.value).toBe('red');
    expect(
      popupLayer.querySelector('.guild-page__swatch[data-color-id="red"]')?.getAttribute(
        'aria-checked',
      ),
    ).toBe('true');

    popupLayer.querySelector('input[name="name"]').value = 'ember hall';
    gameplayFacade.emitGuild(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );

    expect(popupLayer.querySelector('input[name="name"]')?.value).toBe('ember hall');
    expect(popupLayer.querySelector('input[name="tag"]')?.value).toBe('ASH');
    expect(popupLayer.querySelector('input[name="color"]')?.value).toBe('red');
  });

  it('closes guild settings after a successful save', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent, popupLayer } = mountManager(gameplayFacade);

    [...parent.querySelectorAll('.guild-page__wide-button')]
      .find((button) => button.textContent === 'settings')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const popup = popupLayer.querySelector('.guild-page__popup');
    const form = popupLayer.querySelector('form.guild-page__form');

    expect(popup?.hidden).toBe(false);

    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    expect(gameplayFacade.updateGuildProfile).toHaveBeenCalledWith({
      name: 'ash hall',
      tag: 'ASH',
      color: 'red',
    });
    expect(popup?.hidden).toBe(true);
  });

  it('keeps the active guild settings name input mounted across refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const nameInput = popupLayer.querySelector('input[name="name"]');
    nameInput.focus();
    nameInput.value = 'ember hall';
    nameInput.setSelectionRange(5, 5);
    nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    gameplayFacade.emitGuild(
      createGuildSnapshot({
        created: true,
        profile: {
          name: 'ash hall',
          tag: 'ASH',
          color: 'red',
        },
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
        },
        adventurers: [],
        board: [],
        applicants: [],
        logs: [],
      }),
    );

    const refreshedNameInput = popupLayer.querySelector('input[name="name"]');
    expect(refreshedNameInput).toBe(nameInput);
    expect(document.activeElement).toBe(nameInput);
    expect(refreshedNameInput.value).toBe('ember hall');
    expect(refreshedNameInput.selectionStart).toBe(5);
    expect(refreshedNameInput.selectionEnd).toBe(5);
  });

  it('uses alliance-style tag color swatches in the charter form', () => {
    const gameplayFacade = createGameplayFacadeFake();
    const { popupLayer } = mountManager(gameplayFacade);

    document
      .querySelector('.guild-page__wide-button')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const legend = popupLayer.querySelector('.guild-page__color-field legend');
    const swatches = popupLayer.querySelectorAll('.guild-page__swatch');
    const radioInputs = popupLayer.querySelectorAll('input[type="radio"][name="color"]');

    expect(legend?.textContent).toBe('tag color');
    expect(swatches).toHaveLength(10);
    expect(radioInputs).toHaveLength(0);
    expect(popupLayer.querySelector('input[type="hidden"][name="color"]')?.value).toBe('ink');
  });

  it('keeps guild dialog labels outside the scrolling clip', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const dialogRule = baseCss.match(
      /\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.guild-page__popup-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(dialogRule).toMatch(/\bdisplay:\s*flex;/);
    expect(dialogRule).toMatch(/\bflex-direction:\s*column;/);
    expect(dialogRule).not.toMatch(/\boverflow:\s*hidden;/);
    expect(contentRule).toMatch(/\bmin-height:\s*0;/);
    expect(contentRule).toMatch(/\boverflow:\s*hidden auto;/);
  });

  it('aligns guild card dialog tabs with the shared tabbed popup pattern', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const panelRule = baseCss.match(
      /\.guild-page__popup-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const dialogRule = baseCss.match(
      /\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const cardDialogRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="adventurer"\]\s+\.style-dialog\.guild-page__dialog,\s*\.guild-page__popup-panel\[data-popup-kind="applicant"\]\s+\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabsRule = baseCss.match(
      /\.guild-page__tabs\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabButtonRule = baseCss.match(
      /\.style-button\.guild-page__tab-button\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(panelRule).toMatch(/\bwidth:\s*var\(--style-tabbed-dialog-width\);/);
    expect(dialogRule).toMatch(/\bwidth:\s*260px;/);
    expect(dialogRule).not.toMatch(/\bbox-sizing:\s*border-box;/);
    expect(cardDialogRule).toMatch(
      /\bheight:\s*var\(--style-tabbed-dialog-content-height\);/,
    );
    expect(tabsRule).toMatch(/\bmargin-top:\s*var\(--style-dialog-tab-gap\);/);
    expect(tabsRule).not.toMatch(/\bmargin-top:\s*-2px;/);
    expect(tabButtonRule).toMatch(/\bflex:\s*1 1 0;/);
    expect(tabButtonRule).toMatch(/\bmin-width:\s*0;/);
    expect(tabButtonRule).not.toMatch(/\bmin-width:\s*72px;/);
  });

  it('keeps guild popup panels inside the room safe area and visible keyboard stage', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const popupRule = baseCss.match(
      /\.guild-page__popup\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const panelRule = baseCss.match(
      /\.guild-page__popup-panel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const keyboardRule = baseCss.match(
      /:where\(\s*\.room-page__popup-layer \[role="dialog"\],[\s\S]*?\):focus-within\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(popupRule).toContain('--guild-page-popup-center-y:');
    expect(panelRule).toMatch(/\btop:\s*var\(--guild-page-popup-center-y\);/);
    expect(panelRule).toMatch(
      /\bmax-width:\s*calc\(100%\s*-\s*\(var\(--style-room-content-edge\)\s*\*\s*2\)\);/,
    );
    expect(panelRule).toContain('100% - var(--style-room-content-top) -');
    expect(panelRule).toContain('var(--style-room-chat-clearance)');
    expect(panelRule).toContain('var(--app-dialog-y-shift, 0px)');
    expect(keyboardRule).toContain(
      '--app-dialog-y-shift: var(--app-keyboard-dialog-shift);',
    );
  });

  it('keeps guild content tabs fixed near world chat with the panel scrolling above them', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const uiLayerRule = baseCss.match(
      /\.guild-page__ui-layer\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const contentRule = baseCss.match(
      /\.guild-page__content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const centeredRule = baseCss.match(
      /\.guild-page__content--centered\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabsRule = baseCss.match(
      /\.guild-page__content-tabs\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const tabpanelRule = baseCss.match(
      /\.guild-page__tabpanel\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(uiLayerRule).not.toContain('overflow: hidden auto;');
    expect(contentRule).toMatch(/\bposition:\s*absolute;/);
    expect(contentRule).toMatch(/\btop:\s*var\(--style-room-content-top\);/);
    expect(contentRule).toMatch(/\bright:\s*var\(--style-room-content-edge\);/);
    expect(contentRule).toMatch(/\bbottom:\s*var\(--style-room-chat-clearance\);/);
    expect(contentRule).toMatch(/\bleft:\s*var\(--style-room-content-edge\);/);
    expect(contentRule).toMatch(
      /\bwidth:\s*calc\(100%\s*-\s*\(var\(--style-room-content-edge\)\s*\*\s*2\)\);/,
    );
    expect(contentRule).not.toMatch(/--style-main-box-width/);
    expect(centeredRule).toMatch(/\bleft:\s*var\(--style-room-content-edge\);/);
    expect(centeredRule).toMatch(
      /\bright:\s*calc\(var\(--style-room-content-edge\)\s*\*\s*3\);/,
    );
    expect(centeredRule).toMatch(/\bbottom:\s*auto;/);
    expect(centeredRule).toMatch(/\btranslate:\s*0 -50%;/);
    expect(tabsRule).toMatch(/\bposition:\s*absolute;/);
    expect(tabsRule).toMatch(/\bbottom:\s*6px;/);
    expect(tabsRule).toMatch(/\bz-index:\s*20;/);
    expect(tabpanelRule).toMatch(/\bposition:\s*absolute;/);
    expect(tabpanelRule).toMatch(
      /\bbottom:\s*var\(--style-page-tab-scroll-clearance\);/,
    );
    expect(tabpanelRule).toMatch(/\bpadding-top:\s*var\(--style-page-scroll-padding-top\);/);
    expect(tabpanelRule).toMatch(
      /\bpadding-bottom:\s*var\(--style-page-scroll-padding-bottom\);/,
    );
    expect(tabpanelRule).toMatch(/\boverflow:\s*hidden auto;/);
    expect(tabpanelRule).toMatch(/\btouch-action:\s*pan-y;/);
  });
});

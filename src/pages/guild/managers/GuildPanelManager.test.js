// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageSwipeNavigationManager } from '../../managers/PageSwipeNavigationManager.js';
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
    rewardText: '12 coin, 3 seeds, or 4 herbs',
    lore: 'a village needs light.',
    expiresLabel: '12m',
  };
  const availableRequest = {
    id: 'request-2',
    title: 'old road escort',
    difficulty: 'medium',
    statLabel: 'endurance / charisma',
    rewardText: '20 coin, 5 seeds, or 6 herbs',
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
        iconKey: 'adventurer_cleric',
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
        iconKey: 'adventurer_shadowdagger',
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
    hireGuildApplicant: vi.fn(() => ({ ok: true })),
    fireGuildAdventurer: vi.fn(() => ({ ok: true })),
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

function dispatchTouchPointer(target, type, { clientX, clientY }) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    isPrimary: { value: true },
    pointerId: { value: 1 },
    pointerType: { value: 'touch' },
  });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.useRealTimers();
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
    expect(parent.querySelector('.guild-page__content-tabs')?.dataset.pageSwipeBlock).toBe(
      'true',
    );
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

  it('keeps guild tab taps out of page-swipe capture', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);
    const stage = document.createElement('section');
    const pageSwipeManager = new PageSwipeNavigationManager({
      getCurrentPageId: () => 'guild',
    });
    const boardTab = parent.querySelector(
      '.guild-page__content-tab-button[data-guild-tab="board"]',
    );

    stage.append(parent);
    document.body.append(stage);
    pageSwipeManager.mount(stage);

    dispatchTouchPointer(boardTab, 'pointerdown', { clientX: 100, clientY: 100 });
    const move = dispatchTouchPointer(boardTab, 'pointermove', { clientX: 120, clientY: 100 });

    expect(move.defaultPrevented).toBe(false);

    boardTab?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(parent.querySelector('.guild-page__tabpanel')?.dataset.guildTabPanel).toBe('board');

    pageSwipeManager.unmount();
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

  it('preserves guild room panel scroll position across refreshes and tab switches', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="board"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const panel = parent.querySelector('.guild-page__tabpanel');
    panel.scrollTop = 96;

    gameplayFacade.emitGuild(
      createCreatedGuildSnapshot({
        boardWaveLabel: '11m',
      }),
    );

    const refreshedPanel = parent.querySelector('.guild-page__tabpanel');
    expect(refreshedPanel).toBe(panel);
    expect(refreshedPanel?.dataset.guildTabPanel).toBe('board');
    expect(refreshedPanel?.scrollTop).toBe(96);

    refreshedPanel.scrollTop = 64;
    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="log"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const logPanel = parent.querySelector('.guild-page__tabpanel');
    expect(logPanel?.dataset.guildTabPanel).toBe('log');
    expect(logPanel?.scrollTop).toBe(0);
    logPanel.scrollTop = 32;

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="board"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.guild-page__tabpanel')?.scrollTop).toBe(64);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="log"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(parent.querySelector('.guild-page__tabpanel')?.scrollTop).toBe(32);
  });

  it('shows board requests as papers and reviews incoming quests in a stack dialog', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent, popupLayer } = mountManager(gameplayFacade);

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
    const boardPaper = boardBox?.querySelector('.guild-page__quest-paper');
    const boardReward = boardPaper?.querySelector('.guild-page__request-reward');
    const reviewButton = availableBox?.querySelector('.guild-page__wide-button');

    expect(parent.querySelector('.guild-page__board-separator')).toBeNull();
    expect(boardBox?.classList.contains('guild-page__box--request-board')).toBe(true);
    expect(boardBox?.querySelector('.guild-page__quest-board')).not.toBeNull();
    expect(boardPaper?.querySelector('.guild-page__request-title')?.textContent).toBe(
      'lost lantern',
    );
    expect(boardPaper?.querySelector('.guild-page__request-description')?.textContent).toBe(
      'a village needs light.',
    );
    expect(boardPaper?.querySelector('.guild-page__request-meta')?.textContent).toBe(
      'easy, expires 12m',
    );
    expect(boardReward?.textContent).toBe(
      'reward: 12 coin, 3 seeds, or 4 herbs',
    );
    expect(boardReward?.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(
      boardReward?.querySelector('.style-resource-label--seed .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('seed:pack');
    expect(
      boardReward?.querySelector('.style-resource-label--herb .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('herb:sageHerb');
    expect(boardBox?.querySelector('.guild-page__box-bottom')).toBeNull();
    expect(boardPaper?.querySelector('.guild-page__quest-paper-action')?.textContent).toBe(
      'remove',
    );
    expect(
      [...(availableBox?.querySelectorAll('.guild-page__row') ?? [])].find(
        (row) => row.querySelector('.guild-page__row-key')?.textContent === 'incoming',
      )?.textContent,
    ).toBe('incoming1 quest');
    expect(availableBox?.querySelector('.guild-page__request-row')).toBeNull();
    expect(reviewButton?.textContent).toBe('review quests');
    const availableTimerRow = [...(availableBox?.querySelectorAll('.guild-page__row') ?? [])].find(
      (row) => row.querySelector('.guild-page__row-key')?.textContent === 'upcoming quest',
    );
    expect(availableTimerRow?.querySelector('.guild-page__row-value')?.textContent).toBe('12m');
    expect(availableBox?.querySelector('.guild-page__box-bottom')).toBeNull();

    boardPaper
      ?.querySelector('.guild-page__quest-paper-main')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      popupLayer.querySelector('.guild-page__popup-panel')?.dataset.popupKind,
    ).toBe('request');
    const rewardDialogRow = [...popupLayer.querySelectorAll('.guild-page__row')].find(
      (row) => row.querySelector('.guild-page__row-key')?.textContent === 'reward',
    );
    expect(rewardDialogRow?.textContent).toBe('reward12 coin, 3 seeds, or 4 herbs');
    expect(rewardDialogRow?.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(rewardDialogRow?.querySelector('.style-resource-label--seed')).not.toBeNull();
    expect(rewardDialogRow?.querySelector('.style-resource-label--herb')).not.toBeNull();

    popupLayer
      .querySelector('.guild-page__close')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    boardPaper
      ?.querySelector('.guild-page__quest-paper-action')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    reviewButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      popupLayer.querySelector('.guild-page__popup-panel')?.dataset.popupKind,
    ).toBe('requestStack');
    expect(popupLayer.querySelector('.style-box__title')?.textContent).toBe('Incoming Quests');
    expect(popupLayer.querySelector('.guild-page__request-paper-title')?.textContent).toBe(
      'old road escort',
    );
    expect(popupLayer.querySelector('.guild-page__request-paper-page')?.textContent).toBe(
      '1/1',
    );
    expect(popupLayer.querySelector('.guild-page__request-stack-next')?.textContent).toBe(
      'Only Page',
    );
    expect(popupLayer.querySelector('.guild-page__request-stack-next')?.disabled).toBe(true);
    expect(popupLayer.querySelector('.guild-page__request-list')).not.toBeNull();
    expect(
      [...popupLayer.querySelectorAll('.guild-page__request-list-item')].map(
        (button) => button.textContent,
      ),
    ).toEqual(['1Old Road Escort']);
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress')?.getAttribute('aria-valuetext'),
    ).toBe('1/1');
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress-fill')?.style.width,
    ).toBe('100%');
    expect(
      popupLayer.querySelector('.guild-page__request-list-item.is-selected .guild-page__request-list-photo'),
    ).not.toBeNull();
    expect(popupLayer.querySelector('.guild-page__request-detail-card')).not.toBeNull();
    expect(
      [
        ...popupLayer.querySelectorAll(
          '.guild-page__popup-actions .guild-page__request-stack-action',
        ),
      ].map((button) => button.textContent),
    ).toEqual(['Post', 'Only Page']);
    expect(popupLayer.querySelector('.guild-page__request-stack-note')?.textContent).toBe(
      'Papers rotate to the back when you open the next one.',
    );
    expect(
      popupLayer.querySelector('.guild-page__request-paper-content .guild-page__wide-button'),
    ).toBeNull();
    expect(
      popupLayer.querySelector('.style-dialog.guild-page__dialog')?.nextElementSibling,
    ).toBe(popupLayer.querySelector('.guild-page__popup-actions'));
    expect(popupLayer.querySelector('.guild-page__close')?.parentElement).toBe(
      popupLayer.querySelector('.guild-page__popup-actions'),
    );
    expect(popupLayer.querySelector('.guild-page__request-stack-note')?.parentElement).toBe(
      popupLayer.querySelector('.guild-page__request-stack-wrap'),
    );
    const stackRewardRow = [...popupLayer.querySelectorAll('.guild-page__row')].find(
      (row) => row.querySelector('.guild-page__row-key')?.textContent === 'Reward',
    );
    expect(stackRewardRow?.textContent).toBe('Reward20 coin5 seeds6 herbs');
    expect(stackRewardRow?.querySelector('.style-resource-label--coin')).not.toBeNull();
    expect(stackRewardRow?.querySelector('.style-resource-label--seed')).not.toBeNull();
    expect(stackRewardRow?.querySelector('.style-resource-label--herb')).not.toBeNull();

    popupLayer
      .querySelector('.guild-page__request-stack-post')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.removeGuildRequest).toHaveBeenCalledWith('request-1');
    expect(gameplayFacade.postGuildRequest).toHaveBeenCalledWith('request-2');
  });

  it('lays out multiple board papers and keeps available quests behind review', () => {
    const firstRequest = {
      id: 'request-2',
      title: 'old road escort',
      difficulty: 'medium',
      statLabel: 'endurance / charisma',
      rewardText: '20 coin',
      lore: 'a trader wants one honest shadow.',
      expiresLabel: '12m',
    };
    const secondRequest = {
      id: 'request-3',
      title: 'sealed cellar',
      difficulty: 'hard',
      statLabel: 'wits / might',
      rewardText: '35 coin',
      lore: 'cold air moves under the tavern.',
      expiresLabel: '14m',
    };
    const eventRequest = {
      id: 'request-4',
      title: 'guarded witness',
      difficulty: 'medium',
      statLabel: 'wits / charisma',
      rewardText: '40 coin',
      lore: 'a witness changes rooms every bell.',
      expiresLabel: '16m',
    };
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        board: [firstRequest, secondRequest],
        normalBoard: [firstRequest, secondRequest],
        eventBoard: [],
        availableRequests: [firstRequest, secondRequest, eventRequest],
        availableNormalRequests: [firstRequest, secondRequest],
        availableEventRequests: [eventRequest],
        boardWaveLabel: '',
      }),
    );
    vi.useFakeTimers();
    const { parent, popupLayer } = mountManager(gameplayFacade);

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
    const boardPapers = [
      ...(boardBox?.querySelectorAll('.guild-page__quest-paper') ?? []),
    ];
    const boardSeparators = [
      ...(boardBox?.querySelectorAll('.guild-page__quest-separator') ?? []),
    ];
    const boardChildren = [...(boardBox?.querySelector('.guild-page__rows')?.children ?? [])];
    const requestRows = [
      ...(availableBox?.querySelectorAll('.guild-page__request-row') ?? []),
    ];
    const separators = [
      ...(availableBox?.querySelectorAll('.guild-page__quest-separator') ?? []),
    ];
    const children = [...(availableBox?.querySelector('.guild-page__rows')?.children ?? [])];
    const eventLabel = availableBox?.querySelector('.guild-page__section-label');

    expect(boardPapers).toHaveLength(2);
    expect(boardSeparators).toHaveLength(0);
    expect(boardChildren).toHaveLength(1);
    expect(boardChildren[0]?.classList.contains('guild-page__quest-board')).toBe(true);
    expect(boardPapers.map((paper) => paper.querySelector('.guild-page__request-title')?.textContent))
      .toEqual(['old road escort', 'sealed cellar']);
    expect(requestRows).toHaveLength(0);
    expect(separators).toHaveLength(0);
    expect(eventLabel).toBeNull();
    expect(
      [...(availableBox?.querySelectorAll('.guild-page__row') ?? [])].find(
        (row) => row.querySelector('.guild-page__row-key')?.textContent === 'incoming',
      )?.textContent,
    ).toBe('incoming3 quests');
    expect(children.some((child) => child.classList.contains('guild-page__wide-button'))).toBe(
      true,
    );

    availableBox
      ?.querySelector('.guild-page__wide-button')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(popupLayer.querySelector('.guild-page__request-paper-title')?.textContent).toBe(
      'old road escort',
    );
    expect(popupLayer.querySelector('.guild-page__request-paper-page')?.textContent).toBe(
      '1/3',
    );
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress')?.getAttribute('aria-valuetext'),
    ).toBe('1/3');
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress-fill')?.style.width,
    ).toBe('33.33%');
    expect(
      [
        ...popupLayer.querySelectorAll(
          '.guild-page__popup-actions .guild-page__request-stack-action',
        ),
      ].map((button) => button.textContent),
    ).toEqual(['Post', 'Next Page']);

    const dialogBeforeTurn = popupLayer.querySelector('.guild-page__dialog');
    const listItemsBeforeTurn = [
      ...popupLayer.querySelectorAll('.guild-page__request-list-item'),
    ];
    const detailBeforeTurn = popupLayer.querySelector('.guild-page__request-detail-card');

    popupLayer
      .querySelector('.guild-page__request-stack-next')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(
      popupLayer
        .querySelector('.guild-page__popup-panel')
        ?.classList.contains('is-turning-page'),
    ).toBe(true);
    expect(popupLayer.querySelector('.guild-page__request-paper-title')?.textContent).toBe(
      'sealed cellar',
    );
    expect(popupLayer.querySelector('.guild-page__request-paper-page')?.textContent).toBe(
      '2/3',
    );
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress')?.getAttribute('aria-valuetext'),
    ).toBe('2/3');
    expect(
      popupLayer.querySelector('.guild-page__request-stack-progress-fill')?.style.width,
    ).toBe('66.67%');
    expect(popupLayer.querySelector('.guild-page__dialog')).toBe(dialogBeforeTurn);
    expect(popupLayer.querySelector('.guild-page__request-detail-card')).toBe(detailBeforeTurn);
    expect([...popupLayer.querySelectorAll('.guild-page__request-list-item')]).toEqual(
      listItemsBeforeTurn,
    );

    vi.advanceTimersByTime(205);

    expect(
      popupLayer
        .querySelector('.guild-page__popup-panel')
        ?.classList.contains('is-turning-page'),
    ).toBe(false);

    popupLayer
      .querySelector('.guild-page__request-stack-post')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(gameplayFacade.postGuildRequest).toHaveBeenCalledWith('request-3');
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

  it('does not show the applicants timer on the guild hall box', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({ applicantResetLabel: '12m' }),
    );
    const { parent } = mountManager(gameplayFacade);
    const findBox = (title) =>
      [...parent.querySelectorAll('.guild-page__box')].find(
        (box) => box.querySelector('.style-box__title')?.textContent === title,
      );
    const hallBox = findBox('guild hall');

    expect(hallBox?.querySelector('.guild-page__box-count')).toBeNull();

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(findBox('applicants')?.querySelector('.guild-page__box-count')?.textContent).toBe(
      'next 12m',
    );
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
            costCoin: 9000,
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
    ].find((button) => button.textContent === 'upgrade secretary 9000 coin');
    const upgradeCost = upgradeButton?.querySelector('.guild-page__secretary-upgrade-cost');

    expect(secretaryBox).not.toBeUndefined();
    expect(
      [...secretaryBox.querySelectorAll('.guild-page__row-key')].map((row) => row.textContent),
    ).toEqual(['level', 'adventurers', 'board']);
    expect(
      [...secretaryBox.querySelectorAll('.guild-page__row-value')].map((row) => row.textContent),
    ).toEqual(['1', '1 > 2', '3 > 5']);
    expect(
      [...secretaryBox.querySelectorAll('.guild-page__upgrade-preview-gain')].map(
        (gain) => gain.textContent,
      ),
    ).toEqual([' > 2', ' > 5']);
    expect(upgradeButton?.textContent).not.toContain('(');
    expect(upgradeButton?.textContent).not.toContain(')');
    expect(upgradeButton?.getAttribute('aria-label')).toBe('upgrade secretary for 9000 coin');
    expect(upgradeCost?.dataset.resourceColor).toBe('coin');
    expect(
      upgradeCost?.querySelector('.style-resource-label--coin .style-resource-label__icon')
        ?.dataset.assetAtlasFrame,
    ).toBe('resource:coin');
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

  it('renders the trimmed guild secretary icon in the secretary box', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);
    const secretaryBox = [...parent.querySelectorAll('.guild-page__box')].find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'secretary',
    );
    const summary = secretaryBox?.querySelector('.guild-page__secretary-summary');
    const iconRow = secretaryBox?.querySelector('.guild-page__secretary-icon-row');
    const icon = secretaryBox?.querySelector('.guild-page__secretary-icon');
    const rows = secretaryBox?.querySelector('.guild-page__secretary-rows');

    expect([...(summary?.children ?? [])]).toEqual([iconRow, rows]);
    expect(iconRow).not.toBeNull();
    expect(icon?.tagName).toBe('IMG');
    expect(icon?.getAttribute('src')).toContain('guild_secretary.png');
    expect([...(iconRow?.children ?? [])]).toEqual([icon]);
  });

  it('animates the secretary box once when the secretary level increases', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        secretary: {
          level: 1,
          hiredCap: 1,
          boardSlots: 3,
          next: {
            level: 2,
            costCoin: 9000,
            hiredCap: 2,
            boardSlots: 5,
          },
          canUpgrade: true,
        },
      }),
    );
    const { parent } = mountManager(gameplayFacade);
    const findSecretaryBox = () =>
      [...parent.querySelectorAll('.guild-page__box')].find(
        (box) => box.querySelector('.style-box__title')?.textContent === 'secretary',
      );

    expect(findSecretaryBox()?.classList.contains('guild-page__box--secretary-upgraded')).toBe(
      false,
    );

    const upgradedGuild = createCreatedGuildSnapshot({
      secretary: {
        level: 2,
        hiredCap: 2,
        boardSlots: 5,
        next: {
          level: 3,
          costCoin: 12000,
          hiredCap: 3,
          boardSlots: 6,
        },
        canUpgrade: true,
      },
    });
    gameplayFacade.emitGuild(upgradedGuild);

    expect(findSecretaryBox()?.classList.contains('guild-page__box--secretary-upgraded')).toBe(
      true,
    );

    gameplayFacade.emitGuild(upgradedGuild);

    expect(findSecretaryBox()?.classList.contains('guild-page__box--secretary-upgraded')).toBe(
      false,
    );
  });

  it('colors secretary upgrade preview gains green', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const gainRule = baseCss.match(
      /\.guild-page__upgrade-preview-gain\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(gainRule).toMatch(/\bcolor:\s*var\(--style-alliance-tag-green\);/);
  });

  it('styles the guild secretary icon bigger and left of the secretary stats', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const summaryRule = baseCss.match(
      /\.guild-page__secretary-summary\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rowRule = baseCss.match(
      /\.guild-page__secretary-icon-row\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const iconRule = baseCss.match(
      /\.guild-page__secretary-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const rowsRule = baseCss.match(
      /\.guild-page__secretary-rows\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(summaryRule).toMatch(/\bdisplay:\s*grid;/);
    expect(summaryRule).toMatch(/\bgrid-template-columns:\s*88px minmax\(0,\s*1fr\);/);
    expect(summaryRule).toMatch(/\bmin-height:\s*72px;/);
    expect(rowRule).toMatch(/\bdisplay:\s*flex;/);
    expect(rowRule).toMatch(/\bjustify-content:\s*flex-start;/);
    expect(rowRule).toMatch(/\bmin-height:\s*72px;/);
    expect(iconRule).toMatch(/\bwidth:\s*auto;/);
    expect(iconRule).toMatch(/\bheight:\s*72px;/);
    expect(iconRule).toMatch(/\bobject-fit:\s*contain;/);
    expect(iconRule).toMatch(/\bobject-position:\s*0 100%;/);
    expect(rowsRule).toMatch(/\bdisplay:\s*flex;/);
    expect(rowsRule).toMatch(/\bflex-direction:\s*column;/);
  });

  it('styles secretary upgrade motion with a reduced-motion fallback', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const upgradeRule = baseCss.match(
      /\.guild-page__box--secretary-upgraded\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(upgradeRule).toMatch(/\banimation:\s*guild-secretary-upgrade-box\b/);
    expect(upgradeRule).toMatch(/\btransform-origin:\s*center;/);
    expect(baseCss).toContain('@keyframes guild-secretary-upgrade-box');
    expect(baseCss).toContain('@keyframes guild-secretary-upgrade-value');
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.guild-page__box--secretary-upgraded[\s\S]*animation:\s*none;/,
    );
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

  it('renders the guild adventurer card like the player info dialog', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
        adventurers: [
          {
            id: 'adventurer-1',
            iconKey: 'adventurer_cleric',
            displayName: 'mira',
            level: 3,
            xp: 7,
            nextLevelXp: 10,
            status: 'idle',
            statusLabel: 'idle',
            personalityLabel: 'steady',
            stats: {
              wits: 2,
            },
          },
        ],
      }),
    );
    const { parent, popupLayer } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    parent
      .querySelector('.guild-page__adventurer-row .guild-page__row-main')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const card = popupLayer.querySelector('.guild-page__card-info');
    const summary = card?.querySelector('.guild-page__card-summary');
    const details = card?.querySelector('.guild-page__card-details');
    const mainRows = [...(summary?.querySelectorAll('.guild-page__card-row') ?? [])].map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.row_val')?.textContent,
    ]);
    const detailRows = [...(details?.querySelectorAll('.guild-page__card-row') ?? [])].map((row) => [
      row.querySelector('.row_key')?.textContent,
      row.querySelector('.row_val')?.textContent,
    ]);

    expect(popupLayer.querySelector('.style-box__title')?.textContent).toBe('adventurer info');
    expect(summary?.firstElementChild?.classList.contains('guild-page__card-icon')).toBe(true);
    expect(summary?.firstElementChild?.getAttribute('src')).toContain('adventurer_cleric.png');
    expect(summary?.querySelector('.guild-page__card-name')?.textContent).toBe('mira');
    expect(mainRows).toEqual([
      ['level', '3'],
      ['status', 'idle'],
    ]);
    expect(details?.dataset.scrollCueProgress).toBe('inline');
    expect(detailRows).toEqual([
      ['xp', '7/10'],
      ['personality', 'steady'],
      ['wits', '2'],
    ]);
  });

  it('keeps the applicant hire action pinned at the bottom of the card dialog', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent, popupLayer } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const applicantRows = [...parent.querySelectorAll('.guild-page__adventurer-row')];
    applicantRows[1]
      ?.querySelector('.guild-page__row-main')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const card = popupLayer.querySelector('.guild-page__card-info');
    const actions = card?.querySelector('.guild-page__card-actions');
    const hireButton = actions?.querySelector('.guild-page__wide-button');

    expect(popupLayer.querySelector('.style-box__title')?.textContent).toBe('applicant info');
    expect(card?.lastElementChild).toBe(actions);
    expect(hireButton?.textContent).toBe('hire');

    hireButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(gameplayFacade.hireGuildApplicant).toHaveBeenCalledWith('applicant-1');
    expect(popupLayer.querySelector('.guild-page__popup')?.hidden).toBe(true);
  });

  it('preserves applicant info scroll across same-card refreshes', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent, popupLayer } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const applicantRows = [...parent.querySelectorAll('.guild-page__adventurer-row')];
    applicantRows[1]
      ?.querySelector('.guild-page__row-main')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const details = popupLayer.querySelector('.guild-page__card-details');
    const scrollListener = vi.fn();
    details?.addEventListener('scroll', scrollListener);
    details.scrollTop = 88;

    const nextGuild = createCreatedGuildSnapshot({ applicantResetLabel: '11m' });
    nextGuild.applicants = [
      {
        ...nextGuild.applicants[0],
        xp: 4,
        nextLevelXp: 12,
        stats: {
          wits: 3,
        },
      },
    ];
    gameplayFacade.emitGuild(nextGuild);

    const refreshedDetails = popupLayer.querySelector('.guild-page__card-details');
    const detailRows = [...(refreshedDetails?.querySelectorAll('.guild-page__card-row') ?? [])].map(
      (row) => [
        row.querySelector('.row_key')?.textContent,
        row.querySelector('.row_val')?.textContent,
      ],
    );

    expect(refreshedDetails).toBe(details);
    expect(refreshedDetails?.scrollTop).toBe(88);
    expect(scrollListener).toHaveBeenCalled();
    expect(detailRows).toContainEqual(['xp', '4/12']);

    refreshedDetails.scrollTop = 42;
    popupLayer
      .querySelectorAll('.guild-page__tab-button')[1]
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const lifeDetails = popupLayer.querySelector('.guild-page__card-details');
    expect(lifeDetails).not.toBe(refreshedDetails);
    expect(lifeDetails?.scrollTop).toBe(0);
  });

  it('renders adventurers and applicants as compact identity cards', () => {
    const gameplayFacade = createGameplayFacadeFake(createCreatedGuildSnapshot());
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const boxes = [...parent.querySelectorAll('.guild-page__box')];
    const adventurersBox = boxes.find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'adventurers',
    );
    const applicantsBox = boxes.find(
      (box) => box.querySelector('.style-box__title')?.textContent === 'applicants',
    );
    const adventurerRow = adventurersBox?.querySelector('.guild-page__adventurer-row');
    const applicantRow = applicantsBox?.querySelector('.guild-page__adventurer-row');

    expect(adventurerRow?.querySelector('.guild-page__adventurer-icon')?.tagName).toBe('IMG');
    expect(
      adventurerRow?.querySelector('.guild-page__adventurer-icon')?.getAttribute('src'),
    ).toContain('adventurer_cleric.png');
    expect(adventurerRow?.querySelector('.guild-page__adventurer-name')?.textContent).toBe('mira');
    expect(adventurerRow?.querySelector('.guild-page__adventurer-level')?.textContent).toBe(
      'level 1',
    );
    expect(adventurerRow?.querySelector('.guild-page__adventurer-status')?.textContent).toBe(
      'idle',
    );
    expect(adventurerRow?.querySelector('.guild-page__adventurer-main')?.getAttribute('aria-label'))
      .toBe('mira, level 1, idle');

    expect(applicantRow?.querySelector('.guild-page__adventurer-icon')?.tagName).toBe('IMG');
    expect(
      applicantRow?.querySelector('.guild-page__adventurer-icon')?.getAttribute('src'),
    ).toContain('adventurer_shadowdagger.png');
    expect(applicantRow?.querySelector('.guild-page__adventurer-name')?.textContent).toBe('orin');
    expect(applicantRow?.querySelector('.guild-page__adventurer-level')?.textContent).toBe(
      'level 1',
    );
    expect(applicantRow?.querySelector('.guild-page__adventurer-status')?.textContent).toBe(
      'idle',
    );
    expect(applicantRow?.querySelector('.guild-page__adventurer-main')?.getAttribute('aria-label'))
      .toBe('orin, level 1, idle');
  });

  it('allows full adventurer names to wrap in roster rows', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const nameRule = baseCss.match(
      /\.guild-page__adventurer-name\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(nameRule).toMatch(/\boverflow:\s*visible;/);
    expect(nameRule).toMatch(/\btext-overflow:\s*clip;/);
    expect(nameRule).toMatch(/\bwhite-space:\s*normal;/);
    expect(nameRule).toMatch(/\boverflow-wrap:\s*anywhere;/);
  });

  it('falls back to source-scale initial placeholders when an icon is missing', () => {
    const gameplayFacade = createGameplayFacadeFake(
      createCreatedGuildSnapshot({
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
        applicants: [],
      }),
    );
    const { parent } = mountManager(gameplayFacade);

    parent
      .querySelector('.guild-page__content-tab-button[data-guild-tab="adventurers"]')
      ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const icon = parent.querySelector('.guild-page__adventurer-icon');

    expect(icon?.tagName).toBe('SPAN');
    expect(icon?.dataset.initial).toBe('m');
  });

  it('styles guild identity cards with large unboxed icons', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rowRule = [
      ...baseCss.matchAll(/\.guild-page__adventurer-row\s*\{(?<body>[^}]*)\}/g),
    ].at(-1)?.groups?.body;
    const mainRule = baseCss.match(
      /\.guild-page__adventurer-main\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const iconRule = baseCss.match(
      /\.guild-page__adventurer-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const levelStatusRule = [
      ...baseCss.matchAll(
        /\.guild-page__adventurer-level,\s*\.guild-page__adventurer-status\s*\{(?<body>[^}]*)\}/g,
      ),
    ].at(-1)?.groups?.body;

    expect(rowRule).toMatch(
      /\bmin-height:\s*calc\(var\(--style-row-min-height\)\s*\*\s*2\);/,
    );
    expect(mainRule).toMatch(/\bgrid-template-columns:\s*48px minmax\(0,\s*1fr\);/);
    expect(iconRule).toMatch(/\bwidth:\s*48px;/);
    expect(iconRule).toMatch(/\bheight:\s*48px;/);
    expect(iconRule).toMatch(/\bobject-fit:\s*cover;/);
    expect(iconRule).toMatch(/\bobject-position:\s*50%\s*13%;/);
    expect(iconRule).not.toMatch(/\bborder:\s*var\(--style-border\);/);
    expect(baseCss).not.toMatch(
      /\.guild-page__adventurer-main:hover\s+\.guild-page__adventurer-icon[\s\S]*border:\s*var\(--style-border-strong\);/,
    );
    expect(levelStatusRule).toMatch(/\bfont-size:\s*var\(--style-box-border-label-font-size\);/);
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

  it('styles guild request papers as compact board notes', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const boardRule = baseCss.match(
      /\.guild-page__quest-board\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const paperRule = baseCss.match(
      /\.guild-page__quest-paper\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const paperMainRule = baseCss.match(
      /\.guild-page__quest-paper-main\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestLineRule = baseCss.match(
      /\.guild-page__request-title,\s*\.guild-page__request-description,\s*\.guild-page__request-meta,\s*\.guild-page__request-reward\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestPaperTitleRule = baseCss.match(
      /\.guild-page__request-paper-title\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestPaperValueRule = baseCss.match(
      /\.guild-page__request-paper-rows\s+\.guild-page__row-value,\s*\.guild-page__request-paper-rows\s+\.guild-page__paragraph\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(boardRule).toMatch(/\bgrid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
    expect(paperRule).toMatch(
      /\bborder:\s*var\(--guild-page-paper-frame-width\) solid transparent;/,
    );
    expect(paperRule).toContain(
      'border-image-source: var(--guild-page-paper-frame);',
    );
    expect(paperRule).toMatch(/\bmin-height:\s*106px;/);
    expect(paperMainRule).toMatch(/\bflex-direction:\s*column;/);
    expect(requestLineRule).toMatch(/\bwhite-space:\s*normal;/);
    expect(requestLineRule).toMatch(/\boverflow-wrap:\s*anywhere;/);
    expect(requestPaperTitleRule).toMatch(/\boverflow-wrap:\s*anywhere;/);
    expect(requestPaperValueRule).toMatch(/\bwhite-space:\s*normal;/);
    expect(requestPaperValueRule).toMatch(/\btext-overflow:\s*clip;/);
    expect(baseCss).not.toMatch(/\.guild-page__board-separator\b/);
  });

  it('keeps guild request reward resources on resource colors', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const coinRule = baseCss.match(
      /\.guild-page__request-reward\s+\[data-resource-color="coin"\],\s*\.guild-page__request-paper-content\s+\[data-resource-color="coin"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const seedRule = baseCss.match(
      /\.guild-page__request-reward\s+\[data-resource-color="seed"\],\s*\.guild-page__request-paper-content\s+\[data-resource-color="seed"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const herbRule = baseCss.match(
      /\.guild-page__request-reward\s+\[data-resource-color="herb"\],\s*\.guild-page__request-paper-content\s+\[data-resource-color="herb"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(coinRule).toMatch(/\bcolor:\s*var\(--guild-page-paper-coin\);/);
    expect(seedRule).toMatch(/\bcolor:\s*var\(--guild-page-paper-seed\);/);
    expect(herbRule).toMatch(/\bcolor:\s*var\(--guild-page-paper-herb\);/);
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

  it('keeps guild quest 9-slice margins in CSS border-image order', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const expectedSlices = [
      '--guild-page-paper-frame-slice: 41 42 42 41 fill;',
      '--guild-page-quest-dialog-frame-slice: 43 44 43 43 fill;',
      '--guild-page-quest-paper-frame-slice: 41 42 42 41 fill;',
      '--guild-page-quest-list-row-frame-slice: 24 32 23 31 fill;',
      '--guild-page-quest-button-frame-slice: 27 43 28 43 fill;',
      '--guild-page-quest-close-frame-slice: 28 28 27 27 fill;',
    ];

    for (const declaration of expectedSlices) {
      expect(baseCss).toContain(declaration);
    }
  });

  it('styles guild request dialogs with zoom and stack page motion', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const requestDialogRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="request"\]\s+\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackPanelRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackDialogRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s+\.style-dialog\.guild-page__dialog\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackTitleRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s+\.style-dialog\.guild-page__dialog\s+>\s+\.style-box__title\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackCloseRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s+\.guild-page__close\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackCloseIconRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s+\.guild-page__close::after\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackListRule = baseCss.match(
      /\.guild-page__request-list\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackControlsRule = baseCss.match(
      /\.guild-page__request-stack-controls\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackWrapRule = baseCss.match(
      /\.guild-page__request-stack-wrap\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackProgressRule = baseCss.match(
      /\.guild-page__request-stack-progress\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackProgressFillRule = baseCss.match(
      /\.guild-page__request-stack-progress-fill\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackListItemRule = baseCss.match(
      /\.guild-page__request-list-item\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackListNumberRule = baseCss.match(
      /\.guild-page__request-list-number\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackNormalListLabelRule = baseCss.match(
      /\.guild-page__request-list-item:not\(\.is-selected\)\s+:where\(\.guild-page__request-list-number,\s*\.guild-page__request-list-title\)\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackSelectedListNumberRule = baseCss.match(
      /\.guild-page__request-list-item\.is-selected\s+\.guild-page__request-list-number\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackPaperclipRule = baseCss.match(
      /\.guild-page__request-list-paperclip\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackTurnRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\.is-turning-page[\s\S]*?\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackActionsRule = baseCss.match(
      /\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\s+\.guild-page__popup-actions\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const stackActionRule = baseCss.match(
      /\.style-button\.guild-page__request-stack-action\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const questPaperRule = baseCss.match(
      /\.guild-page__quest-paper\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestPaperRule = baseCss.match(
      /\.guild-page__request-paper-content\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestDetailRule = baseCss.match(
      /\.guild-page__request-detail-card\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestDetailPageRule = baseCss.match(
      /\.guild-page__request-detail-card\s+\.guild-page__request-paper-page\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestDetailValueRule = baseCss.match(
      /\.guild-page__request-detail-row\s+\.guild-page__row-value\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const requestDetailSealRule = baseCss.match(
      /\.guild-page__request-detail-seal\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(requestDialogRule).toContain('guild-request-paper-zoom');
    expect(stackPanelRule).toMatch(/\btranslate:\s*0 -52px;/);
    expect(stackDialogRule).toContain(
      'border-image-source: var(--guild-page-quest-dialog-frame);',
    );
    expect(stackDialogRule).toMatch(/\bheight:\s*391px;/);
    expect(stackDialogRule).toMatch(/\bpadding:\s*13px 2px;/);
    expect(stackTitleRule).toContain('background: var(--guild-page-quest-banner)');
    expect(stackTitleRule).toMatch(/\btop:\s*-52px;/);
    expect(stackTitleRule).toMatch(/\bbox-sizing:\s*border-box;/);
    expect(stackTitleRule).toMatch(/\bpadding:\s*6px 54px 17px;/);
    expect(stackCloseRule).toContain(
      'border-image-source: var(--guild-page-quest-close-frame);',
    );
    expect(stackCloseRule).toMatch(/\bposition:\s*relative;/);
    expect(stackCloseRule).toMatch(/\btop:\s*auto;/);
    expect(stackCloseRule).toMatch(/\bright:\s*-24px;/);
    expect(stackCloseRule).toMatch(/\bbottom:\s*auto;/);
    expect(stackCloseRule).toMatch(/\bz-index:\s*auto;/);
    expect(stackCloseRule).toMatch(/\balign-self:\s*flex-end;/);
    expect(stackCloseRule).toMatch(/\bbackground:\s*transparent;/);
    expect(stackCloseIconRule).toMatch(/\binset:\s*0;/);
    expect(stackControlsRule).toMatch(
      /\bgrid-template-columns:\s*minmax\(0, 1fr\) 102px;/,
    );
    expect(stackControlsRule).toMatch(/\balign-items:\s*stretch;/);
    expect(stackListRule).toMatch(/\bflex-direction:\s*column;/);
    expect(stackListRule).toMatch(/\boverflow:\s*hidden;/);
    expect(baseCss).not.toMatch(/\.guild-page__request-list::-webkit-scrollbar/);
    expect(stackWrapRule).toMatch(/\bflex:\s*1 1 auto;/);
    expect(stackWrapRule).toMatch(/\bwidth:\s*100%;/);
    expect(stackProgressRule).toMatch(/\bflex:\s*0 0 var\(--style-progress-total-height\);/);
    expect(stackProgressRule).toMatch(/\bborder-image:\s*none;/);
    expect(stackProgressFillRule).toMatch(/\bbackground:\s*#a89678;/);
    expect(stackListItemRule).toMatch(/\bgrid-template-columns:\s*16px minmax\(0, 1fr\);/);
    expect(stackListItemRule).toMatch(/\bcolumn-gap:\s*4px;/);
    expect(stackListNumberRule).toMatch(
      /\bcolor:\s*var\(--guild-page-quest-index-color\);/,
    );
    expect(stackListNumberRule).toMatch(/\btext-align:\s*right;/);
    expect(stackListNumberRule).toMatch(/\bbackground:\s*transparent;/);
    expect(stackListNumberRule).toMatch(/\bborder:\s*0;/);
    expect(stackListNumberRule).toMatch(/\bbox-shadow:\s*none;/);
    expect(stackNormalListLabelRule).toMatch(/\btranslate:\s*0 -5px;/);
    expect(stackSelectedListNumberRule).toMatch(/\btranslate:\s*none;/);
    expect(stackPaperclipRule).toMatch(/\btop:\s*-14px;/);
    expect(baseCss).not.toContain('--guild-page-quest-selected-frame');
    expect(baseCss).not.toMatch(/\.guild-page__request-list-item\.is-selected::after/);
    expect(stackTurnRule).toContain('guild-request-page-content-settle');
    expect(stackActionsRule).toMatch(/\bposition:\s*relative;/);
    expect(stackActionsRule).toMatch(/\bbottom:\s*auto;/);
    expect(stackActionsRule).toMatch(/\bmargin:\s*8px 32px 0 24px;/);
    expect(stackActionRule).toContain(
      'border-image-source: var(--guild-page-quest-button-brown-frame);',
    );
    expect(stackActionRule).toMatch(/\bbackground:\s*transparent;/);
    expect(questPaperRule).toContain(
      'border-image-source: var(--guild-page-paper-frame);',
    );
    expect(requestPaperRule).toContain(
      'border-image-source: var(--guild-page-paper-frame);',
    );
    expect(requestDetailRule).toContain(
      'border-image-source: var(--guild-page-quest-paper-frame);',
    );
    expect(requestDetailPageRule).toMatch(/\btop:\s*12px;/);
    expect(requestDetailPageRule).toMatch(/\bright:\s*12px;/);
    expect(requestDetailPageRule).toMatch(
      /\bcolor:\s*var\(--guild-page-quest-index-color\);/,
    );
    expect(requestDetailPageRule).toMatch(/\btext-align:\s*right;/);
    expect(requestDetailPageRule).toMatch(/\bbackground:\s*transparent;/);
    expect(requestDetailPageRule).toMatch(/\bborder:\s*0;/);
    expect(requestDetailPageRule).toMatch(/\bbox-shadow:\s*none;/);
    expect(requestDetailValueRule).toMatch(/\bwhite-space:\s*normal;/);
    expect(requestDetailValueRule).toMatch(/\boverflow-wrap:\s*anywhere;/);
    expect(requestDetailSealRule).toMatch(/\bright:\s*9px;/);
    expect(requestDetailSealRule).toMatch(/\bbottom:\s*9px;/);
    expect(requestDetailSealRule).toMatch(/\bwidth:\s*28px;/);
    expect(baseCss).toMatch(/@keyframes guild-request-paper-zoom/);
    expect(baseCss).toMatch(/@keyframes guild-request-page-content-settle/);
    expect(baseCss).not.toMatch(/@keyframes guild-request-page-under/);
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.guild-page__popup-panel\[data-popup-kind="requestStack"\]\.is-turning-page[\s\S]*animation:\s*none;/,
    );
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

  it('styles guild card dialogs with player-info summary and bottom actions', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const cardRule = baseCss.match(
      /\.guild-page__card-info\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const summaryRule = baseCss.match(
      /\.guild-page__card-summary\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const iconRule = baseCss.match(
      /\.guild-page__card-icon\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const detailsRule = baseCss.match(
      /\.guild-page__card-details\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const actionsRule = baseCss.match(
      /\.guild-page__card-actions\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(cardRule).toMatch(/\bdisplay:\s*flex;/);
    expect(cardRule).toMatch(/\bflex-direction:\s*column;/);
    expect(cardRule).toMatch(/\bheight:\s*100%;/);
    expect(summaryRule).toMatch(/\bgrid-template-columns:\s*72px minmax\(0,\s*1fr\);/);
    expect(iconRule).toMatch(/\bwidth:\s*72px;/);
    expect(iconRule).toMatch(/\bheight:\s*72px;/);
    expect(detailsRule).toMatch(/\bborder-top:\s*var\(--style-border\);/);
    expect(detailsRule).toMatch(/\boverflow:\s*hidden auto;/);
    expect(actionsRule).toMatch(/\bmargin-top:\s*auto;/);
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

  it('uses the shared stage-wide backdrop treatment for guild dialogs', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const guildPopupRule = baseCss.match(
      /\.guild-page__popup\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(guildPopupRule).not.toMatch(/\bbackground:/);
    expect(baseCss).toMatch(
      /\.shop-page__stock-buy-popup:not\(\[hidden\]\),\s*\.guild-page__popup:not\(\[hidden\]\),\s*\.room-player-info-popup:not\(\[hidden\]\),/,
    );
    expect(baseCss).toMatch(
      /\.shop-page__stock-buy-popup,\s*\.guild-page__popup,\s*\.room-top-panel__settings,/,
    );
    expect(baseCss).toMatch(
      /\.game-stage:has\(\.guild-page__popup:not\(\[hidden\]\)\)\s+\.guild-page,/,
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

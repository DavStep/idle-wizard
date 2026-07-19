// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cwd } from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageAnnouncementManager } from './PageAnnouncementManager.js';
import { FEATURE_UNLOCK_FLYOUT_EVENT } from '../featureUnlockEvents.js';

const managers = new Set();

afterEach(() => {
  for (const manager of managers) {
    manager.unmount();
  }

  managers.clear();
  vi.useRealTimers();
});

function createGameplayFacadeFake(snapshot, { emitInitial = true, reports = [] } = {}) {
  const listeners = new Set();
  const pendingReports = [...reports];

  return {
    getSnapshot: () => snapshot,
    queueWhileAwayReports: (...nextReports) => pendingReports.push(...nextReports),
    consumeWhileAwayReports: vi.fn(() => pendingReports.splice(0)),
    publishSnapshot: () => {
      for (const listener of listeners) {
        listener(snapshot);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      if (emitInitial) {
        listener(snapshot);
      }
      return () => listeners.delete(listener);
    },
  };
}

function createSnapshot() {
  return {
    persistence: {
      loadRevision: 0,
    },
    tasks: {
      currentLevel: 1,
    },
    playerLevel: {
      currentLevel: 1,
      levels: [
        {
          level: 1,
          current: true,
          unlocked: true,
          totals: {
            maxGardenTiles: 2,
            maxCauldrons: 1,
            maxManaCap: 50,
            manaPerSecond: 1,
          },
          effects: [],
        },
        {
          level: 2,
          current: false,
          unlocked: false,
          totals: {
            maxGardenTiles: 3,
            maxCauldrons: 1,
            maxManaCap: 100,
            manaPerSecond: 2,
          },
          effects: ['crystal reward 1'],
        },
      ],
    },
    research: {
      completedResearchIds: [],
      tabs: [
        {
          id: 'regular',
          label: 'regular research',
          boxes: [
            {
              id: 'recipes',
              label: 'recipe unlocks research',
              researches: [
                {
                  id: 'unlockRecipe:manaTonic',
                  label: 'mana tonic',
                  value: 'brew',
                  effect: 'brew',
                  completed: false,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function mountManager(snapshot) {
  const stage = document.createElement('section');
  const gameplayFacade = createGameplayFacadeFake(snapshot);
  const manager = new PageAnnouncementManager({ gameplayFacade, displayMs: 10_000 });
  managers.add(manager);
  manager.mount(stage);
  return { gameplayFacade, manager, stage };
}

function mountManagerWithGameplayFacade(
  gameplayFacade,
  { playerFacade, playerShopFacade } = {},
) {
  const stage = document.createElement('section');
  const manager = new PageAnnouncementManager({
    gameplayFacade,
    playerFacade,
    playerShopFacade,
    displayMs: 10_000,
  });
  managers.add(manager);
  manager.mount(stage);
  return { manager, stage };
}

function getReportLineParts(stage) {
  return [...stage.querySelectorAll('.room-announcement__report-line')].map((line) => [
    line.dataset.reportRowType,
    line.querySelector('.room-announcement__report-label')?.textContent,
    line.querySelector('.room-announcement__report-value')?.textContent,
  ]);
}

describe('PageAnnouncementManager', () => {
  it('shows the first playable level-up announcement from level zero', () => {
    const snapshot = createSnapshot();
    snapshot.tasks.currentLevel = 0;
    snapshot.playerLevel.currentLevel = 0;
    const { gameplayFacade, manager, stage } = mountManager(snapshot);

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 1;
    snapshot.playerLevel.currentLevel = 1;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    expect(layer?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe('level up!');
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 1');
    expect(stage.querySelector('.room-announcement__level-from')?.textContent).toBe('level 1');
    expect(stage.querySelector('.room-announcement__level-to')?.hidden).toBe(true);
    expect(
      [...stage.querySelectorAll('.room-announcement__row')].map((row) => [
        row.querySelector('.room-announcement__row-label')?.textContent,
        row.querySelector('.room-announcement__row-value')?.textContent,
      ]),
    ).toEqual([
      ['unlocks', 'market'],
      ['garden plots', '+2'],
      ['cauldrons', '+1'],
      ['mana capacity', '+50 mana'],
      ['mana regeneration', '+1/sec mana'],
    ]);
    expect(layer?.dataset.announcementUnlockDelayMs).toBe('20000');

    manager.hideCurrent();

    expect(layer?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement')?.dataset.announcementKind).toBe('unlock');
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'market unlocked',
    );
    expect(stage.querySelector('.room-announcement__unlock-label')?.textContent).toBe('market');
    expect(stage.querySelector('.room-announcement__unlock-detail')?.textContent).toBe(
      'new room available',
    );
    expect(
      stage
        .querySelector('.room-announcement__unlock-icon')
        ?.getAttribute('src'),
    ).toContain('icon-shop-market-stall-tab');

    const flyoutEvent = vi.fn();
    stage.addEventListener(FEATURE_UNLOCK_FLYOUT_EVENT, flyoutEvent);
    manager.hideCurrent();

    expect(flyoutEvent).toHaveBeenCalledTimes(1);
    expect(flyoutEvent.mock.calls[0][0].detail).toEqual({
      features: [{ value: 'market', pageId: 'shop' }],
      pageIds: ['shop'],
      sourceRect: { left: 0, top: 0, width: 0, height: 0 },
    });
  });

  it('shows a full-screen level-up announcement after level increases', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    expect(layer?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement')?.classList.contains('style-dialog')).toBe(
      false,
    );
    expect(stage.querySelector('.room-announcement__close')).toBeNull();
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe('level up!');
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 1> 2');
    expect(stage.querySelector('.room-announcement__level-from')?.textContent).toBe('level 1');
    expect(stage.querySelector('.room-announcement__level-to')?.textContent).toBe('> 2');
    expect(
      [...stage.querySelectorAll('.room-announcement__row')].map((row) => [
        row.querySelector('.room-announcement__row-label')?.textContent,
        row.querySelector('.room-announcement__row-value')?.textContent,
      ]),
    ).toEqual([
      ['unlocks', 'garden / research'],
      ['mana capacity', '+50 mana'],
      ['mana regeneration', '+1/sec mana'],
      ['bonus', '+1 crystal'],
    ]);
  });

  it('hands off workshop feature unlocks that do not have page ids', () => {
    const snapshot = createSnapshot();
    const { manager, stage } = mountManager(snapshot);
    const flyoutEvent = vi.fn();
    stage.addEventListener(FEATURE_UNLOCK_FLYOUT_EVENT, flyoutEvent);
    manager.current = {
      kind: 'unlock',
      values: ['leaderboard'],
      pageIds: {},
      notices: { leaderboard: 'leaderboard available' },
    };
    manager.renderAnnouncement(manager.current);
    manager.layer.hidden = false;

    manager.hideCurrent();

    expect(flyoutEvent).toHaveBeenCalledTimes(1);
    expect(flyoutEvent.mock.calls[0][0].detail.features).toEqual([
      { value: 'leaderboard', pageId: null },
    ]);
    expect(flyoutEvent.mock.calls[0][0].detail.pageIds).toEqual([]);
  });

  it('keeps multi-level unlock announcements in a stable row layout', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    snapshot.tasks.currentLevel = 10;
    snapshot.playerLevel.currentLevel = 10;
    gameplayFacade.publishSnapshot();

    const unlockRow = stage.querySelector('.room-announcement__row');
    expect(unlockRow?.classList.contains('room-announcement__row--list')).toBe(true);
    expect(unlockRow?.querySelector('.room-announcement__row-label')?.textContent).toBe(
      'unlocks',
    );
    expect(unlockRow?.querySelector('.room-announcement__row-value')?.textContent).toBe(
      'garden / research / brewing / prestige / leaderboard / discoveries / alliance / inbox',
    );
  });

  it('allows long announcement values to wrap without collapsing labels', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const rowRule = baseCss.match(/\.room-announcement__row\s*\{(?<body>[^}]*)\}/)?.groups
      ?.body;
    const valueRule = baseCss.match(
      /\.room-announcement__row-value\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(rowRule).toContain('grid-template-columns: minmax(72px, 0.8fr) minmax(0, 1.2fr);');
    expect(valueRule).toContain('min-width: 0;');
    expect(valueRule).toContain('overflow-wrap: break-word;');
    expect(valueRule).toContain('white-space: normal;');
  });

  it('captures the saved level baseline when subscriptions do not emit immediately', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, { emitInitial: false });
    const { stage } = mountManagerWithGameplayFacade(gameplayFacade);

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 1> 2');
  });

  it('does not replay saved level and research announcements after persistence hydration', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    snapshot.persistence.loadRevision = 1;
    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);

    snapshot.tasks.currentLevel = 3;
    snapshot.playerLevel.currentLevel = 3;
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe('level up!');
    expect(stage.querySelector('.room-announcement__level-flow')?.textContent).toBe('level 2> 3');
  });

  it('keeps announcements open until the timed flow completes', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    layer.click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));

    expect(layer.hidden).toBe(false);
  });

  it('renders pending while-away reports as compact dismissible dialogs', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, {
      emitInitial: false,
      reports: [
        {
          kind: 'whileAway',
          rows: [
            { type: 'auto_seed_summoned', quantity: 8 },
            { type: 'garden_harvested', label: 'bloodrose', quantity: 12 },
            { type: 'brewing_complete', label: 'mana tonic', quantity: 2 },
            { type: 'npc_market_sold', coin: 40 },
          ],
        },
      ],
    });
    const { stage } = mountManagerWithGameplayFacade(gameplayFacade, {
      playerFacade: { getSnapshot: () => ({ username: '  Elara  ' }) },
    });

    const layer = stage.querySelector('.room-announcement-layer');
    const panel = stage.querySelector('.room-announcement');

    expect(gameplayFacade.consumeWhileAwayReports).toHaveBeenCalledTimes(1);
    expect(layer?.hidden).toBe(false);
    expect(panel?.classList.contains('style-dialog')).toBe(true);
    expect(panel?.classList.contains('room-announcement--report')).toBe(true);
    expect(stage.querySelector('.room-announcement__report-title')?.textContent).toBe(
      'while away',
    );
    expect(stage.querySelector('.room-announcement__report-intro')).toBeNull();
    expect(getReportLineParts(stage)).toEqual([
      ['auto_seed_summoned', 'auto seed summoned', '8 seeds'],
      ['garden_harvested', 'garden harvested', '12 bloodrose'],
      ['brewing_complete', 'brewing complete', '2 mana tonic'],
      ['npc_market_sold', 'traders bought', '40 coin'],
    ]);
    expect(
      stage.querySelector(
        '.room-announcement__report-line[data-report-row-type="npc_market_sold"] .room-announcement__report-value .style-resource-label--coin .style-resource-label__amount',
      )?.textContent,
    ).toBe('40');
    expect(
      stage
        .querySelector(
          '.room-announcement__report-line[data-report-row-type="npc_market_sold"] .room-announcement__report-value .style-resource-label--coin .style-resource-label__icon',
        )
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('resource:coin');

    stage.querySelector('.room-announcement__close')?.click();
    expect(layer?.hidden).toBe(true);
  });

  it('renders while-away report rewards with right-side item and resource icons', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, {
      emitInitial: false,
      reports: [
        {
          kind: 'whileAway',
          rows: [
            { type: 'auto_seed_summoned', quantity: 8 },
            { type: 'garden_harvested', label: 'bloodrose', quantity: 12 },
            { type: 'brewing_complete', label: 'mana tonic', quantity: 2 },
            { type: 'npc_market_sold', coin: 40 },
          ],
        },
      ],
    });

    const { stage } = mountManagerWithGameplayFacade(gameplayFacade);
    const reportLines = [...stage.querySelectorAll('.room-announcement__report-line')];
    const lineByType = Object.fromEntries(
      reportLines.map((line) => [line.dataset.reportRowType, line]),
    );

    expect(getReportLineParts(stage)).toEqual([
      ['auto_seed_summoned', 'auto seed summoned', '8 seeds'],
      ['garden_harvested', 'garden harvested', '12 bloodrose'],
      ['brewing_complete', 'brewing complete', '2 mana tonic'],
      ['npc_market_sold', 'traders bought', '40 coin'],
    ]);
    expect(
      stage.querySelector('.room-announcement__report-icon'),
    ).toBeNull();
    expect(
      stage.querySelector('.room-announcement__report-icon-sprite'),
    ).toBeNull();
    expect(
      reportLines.every(
        (line) =>
          line.querySelector('.room-announcement__report-label .style-resource-label') === null &&
          line.querySelector('.room-announcement__report-label .style-seed-label') === null &&
          line.querySelector('.room-announcement__report-label .style-herb-label') === null &&
          line.querySelector('.room-announcement__report-label .style-potion-label') === null,
      ),
    ).toBe(true);
    expect(
      lineByType.npc_market_sold?.querySelector(
        '.room-announcement__report-value > .style-resource-label--coin',
      ),
    ).not.toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--coin')?.textContent,
    ).toBe('40 coin');
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label__amount')?.textContent,
    ).toBe('40');
    expect(
      lineByType.npc_market_sold
        ?.querySelector('.style-resource-label__icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('resource:coin');
    expect(
      lineByType.npc_market_sold?.querySelectorAll('.style-resource-label').length,
    ).toBe(1);
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--seed'),
    ).toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--herb'),
    ).toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--mana'),
    ).toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--crystal'),
    ).toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--ruby'),
    ).toBeNull();
    expect(
      lineByType.npc_market_sold?.querySelector('.style-resource-label--emerald'),
    ).toBeNull();
    expect(
      lineByType.garden_harvested
        ?.querySelector('.room-announcement__report-value .style-herb-label__icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('herb:bloodroseHerb');
    expect(
      lineByType.brewing_complete
        ?.querySelector('.room-announcement__report-value .style-potion-label__icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('potion:manaTonic');
    expect(
      lineByType.auto_seed_summoned
        ?.querySelector('.room-announcement__report-value .style-resource-label--seed .style-resource-label__icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('seed:pack');
    expect(
      lineByType.npc_market_sold
        ?.querySelector('.room-announcement__report-value .style-resource-label__icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('resource:coin');
  });

  it('filters player-to-player trade rows out of while-away reports', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, {
      emitInitial: false,
      reports: [
        {
          kind: 'whileAway',
          rows: [
            { type: 'garden_harvested', label: 'bloodrose', quantity: 12 },
            { type: 'player_market_sold', coin: 12 },
            { type: 'player_request_filled', label: 'mint seed', quantity: 3 },
            {
              type: 'player_trade_bought_from_you',
              label: 'sage seed',
              quantity: 4,
              coin: 12,
              username: 'Ada',
            },
            {
              type: 'player_trade_sold_to_you',
              label: 'mint seed',
              quantity: 3,
              coin: 9,
              username: 'Mira',
            },
            { type: 'market_proceeds', coin: 40 },
            {
              type: 'potion_royalty_earned',
              label: 'mana tonic',
              coin: 2.5,
              username: 'Lin',
            },
            { type: 'npc_market_sold', coin: 4 },
          ],
        },
      ],
    });
    const playerShopFacade = {
      retainTradeHistory: vi.fn(() => vi.fn()),
      subscribe: vi.fn(),
    };

    const { stage } = mountManagerWithGameplayFacade(gameplayFacade, { playerShopFacade });

    expect(playerShopFacade.retainTradeHistory).not.toHaveBeenCalled();
    expect(playerShopFacade.subscribe).not.toHaveBeenCalled();
    expect(getReportLineParts(stage)).toEqual([
      ['garden_harvested', 'garden harvested', '12 bloodrose'],
      ['npc_market_sold', 'traders bought', '4 coin'],
    ]);
    expect(
      [...stage.querySelectorAll('.room-announcement__report-line')].map(
        (line) => line.dataset.reportRowType,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        'player_market_sold',
        'player_request_filled',
        'player_trade_bought_from_you',
        'player_trade_sold_to_you',
        'market_proceeds',
        'potion_royalty_earned',
      ]),
    );
  });

  it('does not open a while-away report for only player-to-player trade rows', () => {
    const snapshot = createSnapshot();
    const gameplayFacade = createGameplayFacadeFake(snapshot, {
      emitInitial: false,
      reports: [
        {
          kind: 'whileAway',
          rows: [
            { type: 'player_market_sold', coin: 12 },
            { type: 'player_request_filled', label: 'mint seed', quantity: 3 },
            {
              type: 'player_trade_bought_from_you',
              label: 'sage seed',
              quantity: 4,
              coin: 12,
            },
            { type: 'player_trade_sold_to_you', label: 'mint seed', quantity: 3, coin: 9 },
            { type: 'market_proceeds', coin: 40 },
            { type: 'potion_royalty_earned', label: 'mana tonic', coin: 2.5 },
          ],
        },
      ],
    });

    const { stage } = mountManagerWithGameplayFacade(gameplayFacade);
    const layer = stage.querySelector('.room-announcement-layer');

    expect(layer?.hidden).toBe(true);
    expect(getReportLineParts(stage)).toEqual([]);
  });

  it('keeps while-away report rewards right-aligned', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');
    const reportLineRule = baseCss.match(
      /\.room-announcement__report-line\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const reportLabelRule = baseCss.match(
      /\.room-announcement__report-label\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;
    const reportValueRule = baseCss.match(
      /\.room-announcement__report-value\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(reportLineRule).toContain('display: grid;');
    expect(reportLineRule).toContain(
      'grid-template-columns: minmax(0, 1fr) max-content;',
    );
    expect(reportLabelRule).toContain('text-align: left;');
    expect(reportValueRule).toContain('justify-self: end;');
    expect(reportValueRule).toContain('text-align: right;');
  });

  it('dismisses while-away reports with Escape and backdrop click', () => {
    const snapshot = createSnapshot();
    snapshot.persistence.awayReportRevision = 0;
    const gameplayFacade = createGameplayFacadeFake(snapshot, {
      emitInitial: false,
      reports: [
        {
          kind: 'whileAway',
          rows: [{ type: 'auto_seed_summoned', quantity: 1 }],
        },
      ],
    });
    const { stage } = mountManagerWithGameplayFacade(gameplayFacade, {
      playerFacade: { getSnapshot: () => ({ username: '   ' }) },
    });
    const layer = stage.querySelector('.room-announcement-layer');

    expect(stage.querySelector('.room-announcement__report-intro')).toBeNull();

    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(layer?.hidden).toBe(true);

    gameplayFacade.queueWhileAwayReports({
      kind: 'whileAway',
      rows: [{ type: 'npc_market_sold', coin: 1 }],
    });
    snapshot.persistence.awayReportRevision = 1;
    gameplayFacade.publishSnapshot();

    expect(layer?.hidden).toBe(false);
    layer?.click();
    expect(layer?.hidden).toBe(true);
  });

  it('suppresses normal research announcements from the same while-away catch-up', () => {
    const snapshot = createSnapshot();
    snapshot.persistence.awayReportRevision = 0;
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const { stage } = mountManagerWithGameplayFacade(gameplayFacade);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    gameplayFacade.queueWhileAwayReports({
      kind: 'whileAway',
      rows: [{ type: 'brewing_complete', label: 'mana tonic', quantity: 1 }],
    });
    snapshot.persistence.awayReportRevision = 1;
    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__report-title')?.textContent).toBe(
      'while away',
    );
    expect(getReportLineParts(stage)).toEqual([
      ['brewing_complete', 'brewing complete', '1 mana tonic'],
    ]);

    stage.querySelector('.room-announcement__close')?.click();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(true);
    expect(stage.querySelector('.room-announcement__title')?.textContent).not.toBe(
      'research complete',
    );
  });

  it('auto-advances announcements after the faster default display window', () => {
    vi.useFakeTimers();

    const snapshot = createSnapshot();
    const stage = document.createElement('section');
    const gameplayFacade = createGameplayFacadeFake(snapshot);
    const manager = new PageAnnouncementManager({ gameplayFacade });
    managers.add(manager);
    manager.mount(stage);

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    gameplayFacade.publishSnapshot();

    const layer = stage.querySelector('.room-announcement-layer');
    expect(layer?.hidden).toBe(false);

    vi.advanceTimersByTime(2099);
    expect(layer?.hidden).toBe(false);

    vi.advanceTimersByTime(1);
    expect(layer?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement')?.dataset.announcementKind).toBe('unlock');
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'features unlocked',
    );

    vi.advanceTimersByTime(2100);
    expect(layer?.hidden).toBe(true);
  });

  it('uses x2 faster announcement animation timings', () => {
    const baseCss = readFileSync(`${cwd()}/src/styles/base.css`, 'utf8');

    expect(baseCss).toContain('animation: room-announcement-panel-enter 130ms');
    expect(baseCss).toContain('animation: room-announcement-title-flyout 450ms');
    expect(baseCss).toContain('animation: room-announcement-level-from-sequence 580ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 320ms both;');
    expect(baseCss).toContain('animation: room-announcement-level-to-enter 270ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 720ms both;');
    expect(baseCss).toContain(
      'calc(970ms + (var(--room-announcement-row-index, 0) * 55ms)) both;',
    );
    expect(baseCss).toContain('animation: room-announcement-research-icon 390ms');
    expect(baseCss).toContain('var(--style-motion-ease-rubber) 180ms both;');
  });

  it('shows completed research with a silhouette and actual icon', () => {
    const snapshot = createSnapshot();
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'research complete',
    );
    expect(stage.querySelector('.room-announcement__research-label')?.textContent).toBe(
      'mana tonic',
    );
    expect(stage.querySelector('.room-announcement__research-detail')?.textContent).toBe('brew');
    expect(
      stage
        .querySelector('.room-announcement__research-silhouette')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('potion:manaTonic');
    expect(
      stage
        .querySelector('.room-announcement__research-icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('potion:manaTonic');
  });

  it('shows the seed icon on completed seed research packs', () => {
    const snapshot = createSnapshot();
    snapshot.research.tabs[0].boxes[0].researches[0] = {
      id: 'unlockSeed:mintSeed',
      label: 'mint seed',
      value: 'grow mint',
      effect: 'grow mint',
      completed: false,
    };
    const { gameplayFacade, stage } = mountManager(snapshot);
    const research = snapshot.research.tabs[0].boxes[0].researches[0];

    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    gameplayFacade.publishSnapshot();

    const icon = stage.querySelector('.room-announcement__research-icon');
    expect(
      stage
        .querySelector('.room-announcement__research-silhouette')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('seed:pack');
    expect(icon?.classList.contains('style-seed-pack-composite')).toBe(true);
    expect(icon?.getAttribute('data-asset-atlas-frame')).toBe('seed:pack');
    expect(icon?.getAttribute('data-seed-pack-item-frame')).toBe('herb:mintHerb');
    expect(
      icon?.querySelector('.style-seed-pack-composite__item')?.getAttribute(
        'data-asset-atlas-frame',
      ),
    ).toBe('herb:mintHerb');
  });

  it.each([
    ['summonSeedsX2', 'research:summonMultiplier'],
    ['automation:autoSeedSpawn', 'research:autoSeedSpawn'],
    ['automation:autoPlantTile:1', 'research:autoPlant'],
    ['automation:autoHarvestPlant:1', 'research:autoHarvest'],
    ['automation:autoBrewCauldron:1', 'research:autoBrew'],
    ['automation:autoBottleCauldron:1', 'research:autoBottle'],
    ['fastSellPayout:1', 'research:fastSell'],
    ['advanced:researchTime:1', 'research:researchTime'],
    ['emerald:researchCost:1', 'research:researchCost'],
    ['advanced:automationReserve:1', 'research:automationReserve'],
    ['advanced:plotCapacity:6', 'research:plotCapacity'],
    ['advanced:cauldronCapacity:3', 'research:cauldronCapacity'],
    ['advanced:cauldronBrewing:1:1', 'research:cauldronBrewing'],
    ['advanced:plotGrowth:1:1', 'research:plotGrowth'],
    ['emerald:plotPlanting:1:2', 'research:plotLevel'],
    ['emerald:cauldronBrewing:1:2', 'research:cauldronLevel'],
  ])('maps %s to its research family icon', (researchId, frameName) => {
    const manager = new PageAnnouncementManager();

    expect(manager.getResearchIconFrameName({ id: researchId })).toBe(frameName);
  });

  it('uses facade metadata when completed series research is hidden from visible tabs', () => {
    const snapshot = createSnapshot();
    snapshot.research.tabs[0].boxes[0].researches = [];
    const { gameplayFacade, stage } = mountManager(snapshot);

    gameplayFacade.researchFacade = {
      getResearchAnnouncementSnapshot: (researchId) => ({
        id: researchId,
        label: 'fast sell lvl 1',
        effect: '85% payout',
        value: 'researched',
        costCurrency: 'ruby',
      }),
    };

    snapshot.research.completedResearchIds = ['fastSellPayout:1'];
    gameplayFacade.publishSnapshot();

    expect(stage.querySelector('.room-announcement-layer')?.hidden).toBe(false);
    expect(stage.querySelector('.room-announcement__title')?.textContent).toBe(
      'research complete',
    );
    expect(stage.querySelector('.room-announcement__research-label')?.textContent).toBe(
      'fast sell lvl 1',
    );
    expect(stage.querySelector('.room-announcement__research-detail')?.textContent).toBe(
      '85% payout',
    );
    expect(
      stage
        .querySelector('.room-announcement__research-icon')
        ?.getAttribute('data-asset-atlas-frame'),
    ).toBe('research:fastSell');
  });
});

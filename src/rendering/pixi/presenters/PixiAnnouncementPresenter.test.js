// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

import {
  FEATURE_UNLOCK_PREVIEW_VALUES,
  PIXI_ANNOUNCEMENT_DIALOG_ID,
  PixiAnnouncementPresenter,
  createFeatureUnlockTransientPresentation,
  getFeatureUnlockIconPresentation,
  getFeatureUnlockTargetId,
  getResearchIconPresentation,
} from './PixiAnnouncementPresenter.js';

describe('PixiAnnouncementPresenter', () => {
  it('mounts gameplay and player subscriptions and presents a filtered while-away report', () => {
    const snapshot = createSnapshot();
    const harness = createHarness({
      snapshot,
      playerSnapshot: {
        username: '  Elara  ',
        character: 'elara',
      },
      reports: [
        {
          kind: 'whileAway',
          source: 'save_load',
          offlineSeconds: 60,
          rows: [
            {
              type: 'auto_seed_summoned',
              quantity: 8,
            },
            {
              type: 'player_market_sold',
              coin: 12,
            },
            {
              type: 'garden_harvested',
              label: 'bloodrose',
              quantity: 12,
            },
            {
              type: 'brewing_complete',
              label: 'mana tonic',
              quantity: 2,
            },
            {
              type: 'npc_market_sold',
              coin: 40,
            },
          ],
        },
      ],
    });
    const presenter = harness.createPresenter();

    expect(presenter.mount()).toBe(true);
    expect(presenter.mount()).toBe(false);
    expect(harness.gameplayFacade.subscribe).toHaveBeenCalledTimes(
      1,
    );
    expect(harness.playerFacade.subscribe).toHaveBeenCalledTimes(
      1,
    );
    expect(
      harness.gameplayFacade.consumeWhileAwayReports,
    ).toHaveBeenCalledTimes(1);
    expect(presenter.isOpen()).toBe(true);

    const model = harness.getLastModel();
    expect(model).toMatchObject({
      kind: 'whileAway',
      title: 'While Away',
      variant: 'report',
      framed: true,
      dismissible: true,
      player: {
        username: 'Elara',
        character: 'elara',
      },
      report: {
        source: 'save_load',
        offlineSeconds: 60,
      },
    });
    expect(
      model.rows.map(
        ({ reportRowType, label, value }) => [
          reportRowType,
          label,
          value,
        ],
      ),
    ).toEqual([
      [
        'auto_seed_summoned',
        'Seeds Summoned',
        '8',
      ],
      [
        'garden_harvested',
        'Herbs Harvested',
        '12',
      ],
      [
        'brewing_complete',
        'Potions Brewed',
        '2',
      ],
      ['npc_market_sold', 'Traders Bought', '40'],
    ]);

    expect(presenter.unmount()).toBe(true);
    expect(presenter.unmount()).toBe(false);
    expect(harness.gameplayUnsubscribe).toHaveBeenCalledTimes(1);
    expect(harness.playerUnsubscribe).toHaveBeenCalledTimes(1);
    expect(presenter.isOpen()).toBe(false);
  });

  it('queues each level delta once, preserves timing, and reuses the retained dialog for its unlock', () => {
    const snapshot = createSnapshot();
    const harness = createHarness({ snapshot });
    const presenter = harness.createPresenter();
    presenter.mount();

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    snapshot.crystal.current = 2;
    harness.publishGameplay();

    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
    expect(harness.getLastModel()).toMatchObject({
      kind: 'level',
      title: 'Level Up!',
      ariaLabel: 'Level 2 up. Tap to continue.',
      dismissible: true,
      continueLabel: 'Tap to continue',
      durationMs: 3280,
      pendingDelayMs: 5380,
      level: { from: 1, to: 2 },
    });
    expect(
      harness
        .getLastModel()
        .rows.map(({ label, value, icon }) => [
          label,
          value,
          icon?.frameName ?? null,
        ]),
    ).toEqual([
      ['Unlocks', 'Garden / Research', null],
      ['Mana Capacity', '+50', 'resource:mana'],
      ['Mana Regeneration', '+1/sec', 'resource:mana'],
      ['Bonus', '+1', 'resource:crystal'],
    ]);
    expect(
      harness
        .getLastModel()
        .rows.slice(1)
        .map(({ countUp }) => countUp),
    ).toEqual([
      { from: 50, to: 100, suffix: '' },
      { from: 1, to: 2, suffix: '/sec' },
      { from: 1, to: 2, suffix: '' },
    ]);

    harness.publishGameplay();
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
    expect(harness.timers).toHaveLength(0);

    expect(harness.closeLastDialog('outside')).toBe(true);
    expect(harness.runtime.closeDialog).toHaveBeenCalledTimes(1);
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
    expect(harness.scheduledTasks).toHaveLength(1);

    harness.flushScheduledTasks();
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(2);
    expect(harness.openedViews[0]).toBe(harness.openedViews[1]);
    expect(harness.getLastModel()).toMatchObject({
      kind: 'unlock',
      title: 'features unlocked',
      values: ['garden', 'research'],
      dismissible: false,
      durationMs: 2100,
    });

    harness.fireLastTimer();
    expect(presenter.isOpen()).toBe(false);
    expect(harness.transientEffects).toHaveLength(2);
    expect(harness.transientEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          feature: 'garden',
          pageId: 'garden',
          targetId: 'page.garden',
        }),
        expect.objectContaining({
          feature: 'research',
          pageId: 'research',
          targetId: 'page.research',
        }),
      ]),
    );
  });

  it('suppresses hydration replay and presents only later research completions', () => {
    const snapshot = createSnapshot();
    const harness = createHarness({ snapshot });
    const presenter = harness.createPresenter();
    presenter.mount();
    const research =
      snapshot.research.tabs[0].boxes[0].researches[0];

    snapshot.persistence.loadRevision = 1;
    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    harness.publishGameplay();

    expect(harness.runtime.openDialog).not.toHaveBeenCalled();

    const nextResearch = {
      id: 'advanced:stallStaffing:1',
      label: 'staff stall 1',
      effect: 'sells 2 items per cycle',
      value: 'researched',
      costCurrency: 'ruby',
      completed: true,
    };
    snapshot.research.tabs[0].boxes[0].researches.push(
      nextResearch,
    );
    snapshot.research.completedResearchIds = [
      research.id,
      nextResearch.id,
    ];
    harness.publishGameplay();

    expect(harness.getLastModel()).toMatchObject({
      kind: 'research',
      variant: 'banner-rows',
      title: 'Research Complete!',
      research: {
        id: 'advanced:stallStaffing:1',
      },
      icon: {
        frameName: 'research:fastSell',
        silhouetteFrameName: 'research:fastSell',
      },
    });
    expect(harness.getLastModel().rows).toEqual([
      expect.objectContaining({
        label: 'Research',
        value: 'Staff Stall 1',
        height: 34,
        color: '#ffffff',
      }),
      expect.objectContaining({
        label: 'Effect',
        value: 'sells 2 items per cycle',
        height: 34,
        valueColor: '#ffffff',
      }),
    ]);

    harness.publishGameplay();
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
  });

  it('suppresses normal announcements from an away catch-up and opens only its report', () => {
    const snapshot = createSnapshot();
    const harness = createHarness({ snapshot });
    const presenter = harness.createPresenter();
    presenter.mount();
    const research =
      snapshot.research.tabs[0].boxes[0].researches[0];

    harness.queueReports({
      kind: 'whileAway',
      rows: [
        {
          type: 'brewing_complete',
          label: 'mana tonic',
          quantity: 1,
        },
      ],
    });
    snapshot.persistence.awayReportRevision = 1;
    research.completed = true;
    research.value = 'researched';
    snapshot.research.completedResearchIds = [research.id];
    harness.publishGameplay();

    expect(harness.getLastModel()).toMatchObject({
      kind: 'whileAway',
      title: 'While Away',
      rows: [
        {
          reportRowType: 'brewing_complete',
          label: 'Potions Brewed',
          value: '1',
        },
      ],
    });
    presenter.dismissCurrent('close');
    expect(presenter.isOpen()).toBe(false);
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
  });

  it('keeps dev previews open without timers and emits Pixi transient models when dismissed', () => {
    const harness = createHarness({
      snapshot: createSnapshot(),
    });
    const presenter = harness.createPresenter();
    presenter.mount();

    expect(presenter.showFeatureUnlockPreview()).toEqual({
      ok: true,
      dialogId: 'featureUnlockAnnouncement',
      pixiDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      presentation: presenter.getCurrentPresentation(),
    });
    expect(harness.timers).toHaveLength(0);
    expect(harness.getLastModel()).toMatchObject({
      kind: 'unlock',
      title: 'features unlocked',
      preview: true,
      dismissible: true,
      values: FEATURE_UNLOCK_PREVIEW_VALUES,
    });
    expect(harness.getLastModel().rows).toHaveLength(8);

    expect(presenter.dismissCurrent('outside')).toBe(true);
    expect(presenter.isOpen()).toBe(false);
    expect(harness.transientEffects).toHaveLength(8);
    expect(harness.transientEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          feature: 'garden',
          targetId: 'page.garden',
          sourceBounds: {
            x: 330,
            y: 600,
            width: 186,
            height: 192,
          },
        }),
        expect.objectContaining({
          feature: 'leaderboard',
          targetId: 'workshop.feature.leaderboard',
        }),
      ]),
    );
    expect(
      presenter.getLastCompletionPresentation(),
    ).toMatchObject({
      source: 'outside',
      dialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      transient: {
        kind: 'featureUnlock',
      },
    });

    presenter.showFeatureUnlockPreview({
      values: ['market'],
      pageIds: { market: 'shop' },
    });
    expect(harness.openedViews[0]).toBe(
      harness.openedViews.at(-1),
    );
    expect(
      presenter.showFeatureUnlockPreview({ values: [] }),
    ).toEqual({
      ok: false,
      reason: 'features_missing',
    });

    expect(presenter.showLevelUpPreview()).toEqual({
      ok: true,
      dialogId: 'levelUpAnnouncement',
      pixiDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      presentation: presenter.getCurrentPresentation(),
    });
    expect(harness.getLastModel()).toMatchObject({
      kind: 'level',
      title: 'Level Up!',
      preview: true,
      dismissible: true,
      continueLabel: 'Tap to continue',
      level: { from: 19, to: 20 },
    });
    expect(harness.getLastModel().rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Mana Capacity',
          value: '+50',
          countUp: { from: 950, to: 1000 },
          icon: { frameName: 'resource:mana' },
        }),
        expect.objectContaining({
          label: 'Bonus',
          value: '+1',
          countUp: { from: 2, to: 3 },
          icon: { frameName: 'resource:crystal' },
        }),
      ]),
    );
    expect(harness.timers).toHaveLength(0);

    expect(presenter.showResearchCompletePreview()).toEqual({
      ok: true,
      dialogId: 'researchCompleteAnnouncement',
      pixiDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      presentation: presenter.getCurrentPresentation(),
    });
    expect(harness.getLastModel()).toMatchObject({
      kind: 'research',
      variant: 'banner-rows',
      title: 'Research Complete!',
      preview: true,
      dismissible: true,
      icon: {
        frameName: 'research:fastSell',
        silhouetteFrameName: 'research:fastSell',
      },
      animation: {
        kind: 'research-complete',
        iconDelayMs: 180,
        rowDelayMs: 540,
      },
    });
    expect(harness.getLastModel().rows).toEqual([
      expect.objectContaining({
        label: 'Research',
        value: 'Staff Stall 1',
      }),
      expect.objectContaining({
        label: 'Effect',
        value: 'Sells 2 items per cycle',
      }),
    ]);
    expect(harness.timers).toHaveLength(0);
  });

  it('defers the next queued notice until the dialog closes its retained instance', () => {
    const snapshot = createSnapshot();
    const harness = createHarness({
      snapshot,
      reports: [
        {
          kind: 'whileAway',
          rows: [
            {
              type: 'auto_seed_summoned',
              quantity: 1,
            },
          ],
        },
      ],
    });
    const presenter = harness.createPresenter();
    presenter.mount();

    snapshot.tasks.currentLevel = 2;
    snapshot.playerLevel.currentLevel = 2;
    harness.publishGameplay();
    expect(harness.getLastModel().kind).toBe('whileAway');

    expect(harness.closeLastDialog('outside')).toBe(true);
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(1);
    expect(harness.scheduledTasks).toHaveLength(1);

    harness.flushScheduledTasks();
    expect(harness.runtime.openDialog).toHaveBeenCalledTimes(2);
    expect(harness.getLastModel().kind).toBe('level');
    expect(presenter.isOpen()).toBe(true);
  });

  it('opens a reproducible while-away report preview without gameplay writes', () => {
    const harness = createHarness({
      snapshot: createSnapshot(),
    });
    const presenter = harness.createPresenter();
    presenter.mount();

    expect(presenter.showWhileAwayPreview()).toMatchObject({
      ok: true,
      dialogId: 'whileAwayAnnouncement',
      pixiDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
    });
    expect(harness.getLastModel()).toMatchObject({
      kind: 'whileAway',
      title: 'While Away',
      framed: true,
      dismissible: true,
      rows: [
        {
          reportRowType: 'auto_seed_summoned',
          label: 'Seeds Summoned',
          value: '8',
          icon: {
            frameName: 'seed:pack',
          },
        },
        {
          reportRowType: 'garden_harvested',
          label: 'Herbs Harvested',
          value: '12',
          icon: {
            frameName: 'herb:bloodroseHerb',
          },
        },
        {
          reportRowType: 'garden_harvested',
          label: 'Herbs Harvested',
          value: '18',
          icon: {
            frameName: 'herb:sageHerb',
          },
        },
        {
          reportRowType: 'garden_harvested',
          label: 'Herbs Harvested',
          value: '9',
          icon: {
            frameName: 'herb:mintHerb',
          },
        },
        {
          reportRowType: 'brewing_complete',
          label: 'Potions Brewed',
          value: '2',
          icon: {
            frameName: 'potion:manaTonic',
          },
        },
        {
          reportRowType: 'brewing_complete',
          label: 'Potions Brewed',
          value: '3',
          icon: {
            frameName: 'potion:lanternTonic',
          },
        },
        {
          reportRowType: 'npc_market_sold',
          label: 'Traders Bought',
          value: '40',
          icon: {
            frameName: 'resource:coin',
          },
        },
      ],
    });
    expect(harness.timers).toHaveLength(0);
  });
});

describe('Pixi announcement presentation helpers', () => {
  it('maps feature destinations and research families without DOM geometry', () => {
    expect(
      getFeatureUnlockTargetId({
        value: 'garden',
        pageId: 'garden',
      }),
    ).toBe('page.garden');
    expect(
      getFeatureUnlockTargetId({ value: 'leaderboard' }),
    ).toBe('workshop.feature.leaderboard');
    expect(
      getFeatureUnlockIconPresentation({
        value: 'leaderboard',
      }),
    ).toEqual({
      assetId:
        'source:assets/icons/icon-leaderboard-trophy.webp',
    });
    expect(
      getFeatureUnlockIconPresentation({
        value: 'prestige',
      }),
    ).toEqual({
      assetId:
        'source:assets/icons/icon-prestige-star.png',
    });
    expect(
      getResearchIconPresentation({
        id: 'unlockSeed:mintSeed',
        label: 'mint seed',
      }),
    ).toMatchObject({
      frameName: 'seed:pack',
      silhouetteFrameName: 'seed:pack',
      itemFrameName: 'herb:mintHerb',
    });
    expect(
      getResearchIconPresentation({
        id: 'automation:autoBrewCauldron:1',
      }),
    ).toMatchObject({
      frameName: 'research:autoBrew',
    });
  });

  it('returns effects directly consumable by the retained transient layer', () => {
    expect(
      createFeatureUnlockTransientPresentation({
        key: 'level:1:2:unlock',
        kind: 'unlock',
        values: ['garden', 'leaderboard'],
        pageIds: { garden: 'garden' },
        notices: {
          garden: 'garden unlocked',
          leaderboard: 'leaderboard available',
        },
      }),
    ).toMatchObject({
      kind: 'featureUnlock',
      sourceDialogId: PIXI_ANNOUNCEMENT_DIALOG_ID,
      pageIds: ['garden'],
      effects: [
        {
          type: 'feature_unlocked',
          message: 'garden unlocked',
          runs: [
            {
              kind: 'text',
              text: 'garden unlocked',
            },
          ],
          targetId: 'page.garden',
        },
        {
          type: 'feature_unlocked',
          message: 'leaderboard available',
          targetId: 'workshop.feature.leaderboard',
        },
      ],
    });
  });
});

function createHarness({
  snapshot,
  playerSnapshot = { username: 'wizard' },
  reports = [],
} = {}) {
  const gameplayListeners = new Set();
  const playerListeners = new Set();
  const pendingReports = [...reports];
  const gameplayUnsubscribe = vi.fn();
  const playerUnsubscribe = vi.fn();
  const dialogView = {
    id: 'retained-announcement-view',
    getFeatureSourceBounds: vi.fn(() => [
      {
        value: 'garden',
        pageId: 'garden',
        bounds: {
          x: 330,
          y: 600,
          width: 186,
          height: 192,
        },
      },
    ]),
  };
  const openDialogIds = [];
  const openedViews = [];
  const dialogModels = [];
  const timers = [];
  const scheduledTasks = [];
  const transientEffects = [];

  const runtime = {
    initialized: true,
    openDialog: vi.fn((dialogId, model) => {
      dialogModels.push(model);
      openedViews.push(dialogView);
      if (!openDialogIds.includes(dialogId)) {
        openDialogIds.push(dialogId);
      }
      return dialogView;
    }),
    closeDialog: vi.fn((dialogId) => {
      const index = openDialogIds.indexOf(dialogId);
      if (index < 0) {
        return false;
      }
      openDialogIds.splice(index, 1);
      return true;
    }),
    getOpenDialogIds: vi.fn(() => [...openDialogIds]),
  };
  const renderFacade = {
    getUiRuntime: vi.fn(() => runtime),
  };
  const gameplayFacade = {
    getSnapshot: vi.fn(() => snapshot),
    consumeWhileAwayReports: vi.fn(() =>
      pendingReports.splice(0),
    ),
    subscribe: vi.fn((listener) => {
      gameplayListeners.add(listener);
      return () => {
        gameplayListeners.delete(listener);
        gameplayUnsubscribe();
      };
    }),
  };
  const playerFacade = {
    getSnapshot: vi.fn(() => playerSnapshot),
    subscribe: vi.fn((listener) => {
      playerListeners.add(listener);
      return () => {
        playerListeners.delete(listener);
        playerUnsubscribe();
      };
    }),
  };

  const harness = {
    runtime,
    renderFacade,
    gameplayFacade,
    playerFacade,
    gameplayUnsubscribe,
    playerUnsubscribe,
    timers,
    scheduledTasks,
    transientEffects,
    openedViews,
    createPresenter(options = {}) {
      return new PixiAnnouncementPresenter({
        renderFacade,
        gameplayFacade,
        playerFacade,
        setTimeoutFn: (callback, delay) => {
          const handle = {
            callback,
            delay,
            cleared: false,
            unref: vi.fn(),
          };
          timers.push(handle);
          return handle;
        },
        clearTimeoutFn: (handle) => {
          handle.cleared = true;
        },
        scheduleTask: (callback) => {
          scheduledTasks.push(callback);
        },
        presentTransientEffect: (effect) => {
          transientEffects.push(effect);
        },
        ...options,
      });
    },
    getLastModel() {
      return dialogModels.at(-1);
    },
    publishGameplay() {
      for (const listener of gameplayListeners) {
        listener(snapshot);
      }
    },
    publishPlayer(nextSnapshot) {
      playerSnapshot = nextSnapshot;
      for (const listener of playerListeners) {
        listener(playerSnapshot);
      }
    },
    queueReports(...nextReports) {
      pendingReports.push(...nextReports);
    },
    fireLastTimer() {
      const handle = [...timers]
        .reverse()
        .find((candidate) => !candidate.cleared);
      handle.callback();
    },
    closeLastDialog(source) {
      const result =
        dialogModels.at(-1).actions.advance({ source });
      if (result !== false) {
        runtime.closeDialog(PIXI_ANNOUNCEMENT_DIALOG_ID);
      }
      return result;
    },
    flushScheduledTasks() {
      for (const task of scheduledTasks.splice(0)) {
        task();
      }
    },
  };
  return harness;
}

function createSnapshot() {
  return {
    persistence: {
      loadRevision: 0,
      awayReportRevision: 0,
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
    crystal: {
      current: 1,
    },
    research: {
      completedResearchIds: [],
      tabs: [
        {
          id: 'regular',
          boxes: [
            {
              id: 'recipes',
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

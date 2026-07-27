import { describe, expect, it, vi } from 'vitest';

import { PixiPagesFacade } from './PixiPagesFacade.js';

describe('PixiPagesFacade', () => {
  it('registers all pages once and binds only the active retained instance', () => {
    const harness = createHarness();
    const pages = new PixiPagesFacade(harness.dependencies);

    expect([...harness.factories.keys()]).toEqual([
      'workshop',
      'brewing',
      'garden',
      'research',
      'shop',
      'guild',
      'prestige',
    ]);

    pages.mount();

    expect(harness.runtime.bindPage).toHaveBeenCalledTimes(1);
    expect(harness.runtime.activatePage).toHaveBeenCalledWith('workshop');
    expect(harness.runtime.bindGlobalSurface).toHaveBeenCalledWith(
      'chrome.top',
      expect.objectContaining({ username: 'elara' }),
    );
    expect(harness.runtime.bindGlobalSurface).toHaveBeenCalledWith(
      'chrome.chat',
      expect.objectContaining({
        label: 'world chat',
        visible: true,
      }),
    );

    expect(pages.show('research')).toBe(true);
    expect(pages.getCurrentPageId()).toBe('research');
    expect(harness.runtime.activatePage).toHaveBeenLastCalledWith('research');
    expect(harness.runtime.bindPage).toHaveBeenCalledTimes(2);
    expect(harness.getBoundGlobal('chrome.chat')).toEqual(
      expect.objectContaining({
        label: 'world chat',
        visible: true,
      }),
    );
    expect(harness.getBoundGlobal('chrome.chat').onActivate()).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      'worldChat',
      expect.objectContaining({ title: 'world chat' }),
    );
    expect(pages.getCurrentPageId()).toBe('research');

    pages.unmount();
    expect(harness.runtime.deactivatePage).toHaveBeenCalledTimes(1);
  });

  it('routes view actions to authoritative gameplay facades', () => {
    const harness = createHarness();
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    const workshopModel = harness.getBoundPage('workshop');
    workshopModel.actions.summonSeed();
    expect(harness.gameplayFacade.summonSeed).toHaveBeenCalledTimes(1);

    expect(pages.show('research')).toBe(true);
    const researchModel = harness.getBoundPage('research');
    researchModel.actions.buyResearch('mana-tonic');
    expect(harness.gameplayFacade.buyResearch).toHaveBeenCalledWith(
      'mana-tonic',
    );

    expect(pages.show('guild')).toBe(true);
    const guildModel = harness.getBoundPage('guild');
    guildModel.actions.createGuild({
      name: 'Moon',
      tag: 'MOON',
      color: 'violet',
    });
    expect(harness.gameplayFacade.createGuild).toHaveBeenCalledWith({
      name: 'Moon',
      tag: 'MOON',
      color: 'violet',
    });
  });

  it('keeps retained stall picker drafts interactive until an allocation is marked', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.shop = {
      shelf: {
        sellKinds: [
          { kind: 'seed', label: 'seeds' },
          { kind: 'herb', label: 'herbs' },
        ],
        sellItems: [
          {
            itemTypeId: 1,
            key: 'sageSeed',
            kind: 'seed',
            label: 'sage seed',
            quantity: 8,
          },
          {
            itemTypeId: 2,
            key: 'sageHerb',
            kind: 'herb',
            label: 'sage',
            quantity: 3,
          },
        ],
        slots: [
          {
            slotNumber: 1,
            sellItemTypeId: null,
            futureItemTypeId: null,
            loadedQuantity: 0,
          },
        ],
      },
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.runtime.getOpenDialogIds.mockReturnValue([
      'shop.stall',
    ]);
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show('shop');

    let dialog =
      harness.getBoundPage('shop').shop.traders.stalls[0].dialog;
    expect(dialog.items.map((item) => item.itemKey)).toEqual([
      'sageSeed',
    ]);

    dialog.items[0].action();
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      'shop.stall',
      expect.objectContaining({
        summaryRows: [
          expect.objectContaining({ value: 'sage seed' }),
        ],
      }),
    );
    dialog =
      harness.getBoundPage('shop').shop.traders.stalls[0].dialog;
    expect(dialog.summaryRows[0]).toMatchObject({
      value: 'sage seed',
      quantityLabel: 'x8',
    });
    expect(dialog.actions[0]).toMatchObject({
      label: 'mark x8',
      enabled: true,
    });

    dialog.range.onChange(25);
    dialog =
      harness.getBoundPage('shop').shop.traders.stalls[0].dialog;
    expect(dialog.actions[0].label).toBe('mark x2');

    dialog.tabs.find((tab) => tab.id === 'herb').action();
    dialog =
      harness.getBoundPage('shop').shop.traders.stalls[0].dialog;
    expect(dialog.items.map((item) => item.itemKey)).toEqual([
      'sageHerb',
    ]);

    dialog.tabs.find((tab) => tab.id === 'seed').action();
    dialog =
      harness.getBoundPage('shop').shop.traders.stalls[0].dialog;
    dialog.actions[0].action();

    expect(
      harness.gameplayFacade.selectShopShelfSlot,
    ).toHaveBeenCalledWith(1);
    expect(
      harness.gameplayFacade.setSelectedShopShelfSlotAllocation,
    ).toHaveBeenCalledWith(1, 25);
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith(
      'shop.stall',
    );
  });

  it('rejects locked navigation and delegates the lock surface to retained chrome', () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show('garden')).toBe(false);
    expect(harness.bottomSurface.showLockedPage).toHaveBeenCalledWith(
      'garden',
      expect.objectContaining({ unlocked: false }),
    );
    expect(pages.getCurrentPageId()).toBe('workshop');
  });

  it('keeps global world chat hidden until its existing level-three gate', () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);

    pages.mount();

    expect(harness.getBoundGlobal('chrome.chat')).toEqual(
      expect.objectContaining({
        label: 'world chat',
        visible: false,
      }),
    );
    expect(harness.getBoundGlobal('chrome.chat').onActivate()).toBe(false);
    expect(harness.pageSurface.openDialog).not.toHaveBeenCalled();
  });

  it('prehighlights the adjacent retained tab while a page swipe is owned', () => {
    const harness = createHarness({
      gameplaySnapshot: createGameplaySnapshot({ level: 1 }),
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    const swipe = harness.getPageSwipeRegistration();

    swipe.onSwipeStart();
    swipe.onSwipeMove({
      movement: { screen: { x: -24, y: 1 } },
    });
    expect(
      harness.bottomSurface.setSwipeTargetPageId,
    ).toHaveBeenLastCalledWith('research');

    swipe.onSwipeEnd();
    expect(
      harness.bottomSurface.setSwipeTargetPageId,
    ).toHaveBeenLastCalledWith(null);

    swipe.onSwipeMove({
      movement: { screen: { x: 24, y: 1 } },
    });
    expect(
      harness.bottomSurface.setSwipeTargetPageId,
    ).toHaveBeenLastCalledWith('garden');
    expect(swipe.onSwipe({ direction: 'previous' })).toBe(false);
    expect(harness.bottomSurface.showLockedPage).toHaveBeenCalledWith(
      'garden',
      expect.objectContaining({ unlocked: false }),
    );
  });

  it('projects only main-visible Garden plots with per-tile notifications', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.plot = {
      maxTiles: 3,
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: false,
      tiles: [
        {
          id: 'plot-1',
          tileNumber: 1,
          unlocked: true,
          phase: 'ready',
        },
        {
          id: 'plot-2',
          tileNumber: 2,
          unlocked: false,
          phase: 'empty',
        },
        {
          id: 'plot-3',
          tileNumber: 3,
          unlocked: false,
          phase: 'empty',
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show('garden')).toBe(true);
    expect(
      harness.getBoundPage('garden').garden.plots.map((plot) => ({
        tileNumber: plot.tileNumber,
        hidden: plot.hidden,
        buySlot: plot.buySlot,
        notification: plot.notification,
      })),
    ).toEqual([
      {
        tileNumber: 1,
        hidden: false,
        buySlot: false,
        notification: true,
      },
      {
        tileNumber: 2,
        hidden: false,
        buySlot: true,
        notification: true,
      },
      {
        tileNumber: 3,
        hidden: true,
        buySlot: false,
        notification: false,
      },
    ]);
  });

  it('projects Garden locked-slot affordability and blocks purchases until affordable', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.coin.current = 10;
    gameplaySnapshot.garden.plot = {
      maxTiles: 2,
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: false,
      tiles: [
        {
          id: 'plot-1',
          tileNumber: 1,
          unlocked: true,
          phase: 'empty',
        },
        {
          id: 'plot-2',
          tileNumber: 2,
          unlocked: false,
          phase: 'empty',
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.buyGardenTile.mockReturnValue({
      ok: true,
      tileNumber: 2,
    });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show('garden');

    let garden = harness.getBoundPage('garden');
    let buyPlot = garden.garden.plots[1];
    expect(buyPlot).toMatchObject({
      buySlot: true,
      affordable: false,
      costCoin: 25,
      missingCoin: 15,
      actionText: 'buy 25 coin',
      actionResource: null,
      disabled: false,
    });
    expect(garden.actions.activatePlot(buyPlot)).toEqual({
      ok: false,
      reason: 'insufficient_coin',
      cost: 25,
      missingCoin: 15,
      tileNumber: 2,
    });
    expect(harness.gameplayFacade.buyGardenTile).not.toHaveBeenCalled();

    gameplaySnapshot.coin.current = 25;
    pages.refreshPage('garden');
    garden = harness.getBoundPage('garden');
    buyPlot = garden.garden.plots[1];
    expect(buyPlot).toMatchObject({
      affordable: true,
      missingCoin: 0,
      actionResource: 'coin',
    });
    expect(garden.actions.activatePlot(buyPlot)).toEqual({
      ok: true,
      tileNumber: 2,
    });
    expect(harness.gameplayFacade.buyGardenTile).toHaveBeenCalledTimes(1);
  });

  it('filters and orders Garden seed choices and closes only after a successful selection', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.research.completedResearchIds = [
      'unlockSeed:mintSeed',
    ];
    gameplaySnapshot.garden.seeds = [
      {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 3,
        key: 'nettleSeed',
        label: 'nettle seed',
        kind: 'seed',
        quantity: 0,
      },
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 2,
      },
    ];
    gameplaySnapshot.garden.plot = {
      maxTiles: 1,
      tiles: [
        {
          id: 'plot-1',
          tileNumber: 1,
          unlocked: true,
          phase: 'empty',
        },
      ],
    };
    const harness = createHarness({ gameplaySnapshot });
    harness.gameplayFacade.selectGardenSeed
      .mockReturnValueOnce({ ok: false, reason: 'not_enough_seed' })
      .mockReturnValueOnce({ ok: true, planted: true });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();
    pages.show('garden');
    const garden = harness.getBoundPage('garden');
    const plot = garden.garden.plots[0];

    expect(garden.actions.activatePlot(plot)).toBe(true);
    expect(harness.pageSurface.openDialog).toHaveBeenCalledWith(
      'seed',
      expect.objectContaining({
        plot,
        rows: [
          expect.objectContaining({
            id: 'empty',
            itemTypeId: null,
            emptyOption: true,
          }),
          expect.objectContaining({
            id: 1,
            key: 'sageSeed',
            quantity: 2,
            icon: { kind: 'seed', key: 'sageSeed' },
          }),
          expect.objectContaining({
            id: 2,
            key: 'mintSeed',
            quantity: 0,
          }),
        ],
      }),
    );

    expect(garden.actions.selectSeed(
      { itemTypeId: 1 },
      plot,
    )).toEqual({ ok: false, reason: 'not_enough_seed' });
    expect(harness.runtime.closeDialog).not.toHaveBeenCalled();

    expect(garden.actions.selectSeed(
      { itemTypeId: 1 },
      plot,
    )).toEqual({ ok: true, planted: true });
    expect(harness.runtime.closeDialog).toHaveBeenCalledWith(
      'garden.seed',
    );
  });

  it('owns Garden and Brewing inventory expansion state outside retained views', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.garden.herbs = createInventoryRows('herb', 7);
    gameplaySnapshot.garden.seeds = createInventoryRows('seed', 8);
    gameplaySnapshot.brewing.herbs = createInventoryRows('herb', 7);
    gameplaySnapshot.inventory = createInventoryRows('potion', 8);
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    pages.mount();

    expect(pages.show('garden')).toBe(true);
    let garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory.herbs).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: '6/7',
    });
    expect(garden.garden.inventory.seeds).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: '6/8',
    });

    garden.actions.toggleInventory('herbs');
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory.activeTab).toBe('herbs');
    expect(
      garden.actions.toggleInventoryExpanded('herbs'),
    ).toBe(true);
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory.herbs).toMatchObject({
      expanded: true,
      countText: '7/7',
    });

    garden.actions.toggleInventoryExpanded('herbs');
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory.herbs).toMatchObject({
      expanded: false,
      countText: '6/7',
    });

    garden.actions.toggleInventory('seeds');
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory).toMatchObject({
      activeTab: 'seeds',
      herbs: { expanded: false },
      seeds: { expanded: false },
    });
    garden.actions.toggleInventoryExpanded('seeds');
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory.seeds).toMatchObject({
      expanded: true,
      countText: '8/8',
    });

    expect(pages.show('brewing')).toBe(true);
    let brewing = harness.getBoundPage('brewing');
    expect(brewing.brewing.inventory.herbs).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: '6/7',
    });
    expect(brewing.brewing.inventory.potions).toMatchObject({
      expanded: false,
      canToggle: true,
      countText: '6/8',
    });

    brewing.actions.toggleInventory('potions');
    brewing = harness.getBoundPage('brewing');
    expect(brewing.brewing.inventory.activeTab).toBe('potions');
    brewing.actions.toggleInventoryExpanded('potions');
    brewing = harness.getBoundPage('brewing');
    expect(brewing.brewing.inventory.potions).toMatchObject({
      expanded: true,
      countText: '8/8',
    });
    expect(
      brewing.actions.toggleInventoryExpanded('seeds'),
    ).toBe(false);

    expect(pages.show('garden')).toBe(true);
    garden = harness.getBoundPage('garden');
    expect(garden.garden.inventory).toMatchObject({
      activeTab: null,
      herbs: { expanded: false },
      seeds: { expanded: false },
    });
  });

  it('projects tutorial notification policy without changing source snapshots', () => {
    const gameplaySnapshot = createGameplaySnapshot();
    gameplaySnapshot.tasks.level.tasks = [
      {
        taskId: 'demo-task',
        requirementLabel: 'sage seeds',
        canFill: true,
        requiredQuantity: 1,
        progressQuantity: 1,
      },
    ];
    const harness = createHarness({ gameplaySnapshot });
    const pages = new PixiPagesFacade(harness.dependencies);
    const notifications = {
      active: true,
      pages: {
        workshop: {
          active: true,
          tone: 'red',
          children: {
            seeds: true,
            tasks: true,
          },
        },
        garden: {
          active: true,
          tone: 'red',
          children: { plots: true },
        },
      },
    };
    const sourceCopy = JSON.parse(JSON.stringify(notifications));
    pages.mount();
    pages.setDevNotifications(notifications);

    pages.applyTutorialNotificationVisibilityPolicy({
      active: true,
      allowedTutorialIds: ['workshop:summonSeed'],
    });

    expect(
      harness.getBoundGlobal('chrome.bottom').notifications,
    ).toMatchObject({
      workshop: false,
      garden: false,
    });
    expect(
      harness.getBoundPage('workshop').workshop.summon.notification,
    ).toBe(true);
    expect(
      harness.getBoundPage('workshop').workshop.tasks.rows[0].notification,
    ).toBe(false);

    pages.applyTutorialNotificationVisibilityPolicy({
      active: true,
      allowedTutorialIds: ['task:demo-task', 'page:garden'],
    });

    expect(
      harness.getBoundGlobal('chrome.bottom').notifications.garden,
    ).toBe(notifications.pages.garden);
    expect(
      harness.getBoundPage('workshop').workshop.summon.notification,
    ).toBe(false);
    expect(
      harness.getBoundPage('workshop').workshop.tasks.rows[0].notification,
    ).toBe(true);

    pages.applyTutorialNotificationVisibilityPolicy(null);

    expect(
      harness.getBoundGlobal('chrome.bottom').notifications.workshop,
    ).toBe(notifications.pages.workshop);
    expect(
      harness.getBoundPage('workshop').workshop.summon.notification,
    ).toBe(true);
    expect(
      harness.getBoundPage('workshop').workshop.tasks.rows[0].notification,
    ).toBe(true);
    expect(notifications).toEqual(sourceCopy);
  });
});

function createHarness({
  gameplaySnapshot = createGameplaySnapshot(),
} = {}) {
  const factories = new Map();
  const boundPages = new Map();
  const boundGlobals = new Map();
  const bottomSurface = {
    showLockedPage: vi.fn(),
    setSwipeTargetPageId: vi.fn(),
  };
  const pageSurface = {
    openDialog: vi.fn(() => true),
  };
  const runtime = {
    initialized: true,
    bindPage: vi.fn((pageId, model) => {
      boundPages.set(pageId, model);
    }),
    bindGlobalSurface: vi.fn((surfaceId, model) => {
      boundGlobals.set(surfaceId, model);
    }),
    activatePage: vi.fn(),
    deactivatePage: vi.fn(),
    closeAllDialogs: vi.fn(),
    closeDialog: vi.fn(),
    getOpenDialogIds: vi.fn(() => []),
    getGlobalSurface: vi.fn(() => bottomSurface),
    getPage: vi.fn(() => pageSurface),
  };
  let pageSwipeRegistration = null;
  const inputRouter = {
    registerPageSwipe: vi.fn((registration) => {
      pageSwipeRegistration = registration;
      return { unregister: vi.fn() };
    }),
    setBackHandler: vi.fn(),
    setEscapeHandler: vi.fn(),
  };
  const renderFacade = {
    registerPage: vi.fn(function registerPage(pageId, factory) {
      factories.set(pageId, factory);
      return this;
    }),
    getUiRuntime: vi.fn(() => runtime),
    getInputRouter: vi.fn(() => inputRouter),
    getPixiLayers: vi.fn(() => ({ pageUi: {} })),
  };
  const gameplayFacade = {
    getSnapshot: vi.fn(() => gameplaySnapshot),
    withSnapshotCache: vi.fn((callback) => callback()),
    subscribe: vi.fn(() => vi.fn()),
    subscribeFrameResources: vi.fn(() => vi.fn()),
    summonSeed: vi.fn(),
    fillTask: vi.fn(),
    completeTaskLevel: vi.fn(),
    buyResearch: vi.fn(),
    setPrestigeRunFocus: vi.fn(),
    completePrestigeMilestone: vi.fn(),
    createGuild: vi.fn(),
    updateGuildProfile: vi.fn(),
    upgradeGuildSecretary: vi.fn(),
    postGuildRequest: vi.fn(),
    removeGuildRequest: vi.fn(),
    hireGuildApplicant: vi.fn(),
    fireGuildAdventurer: vi.fn(),
    buyGardenTile: vi.fn(),
    selectGardenSeed: vi.fn(),
    selectShopShelfSlot: vi.fn(() => ({ ok: true })),
    setSelectedShopShelfSlotAllocation: vi.fn(() => ({
      ok: true,
    })),
    clearSelectedShopShelfSlot: vi.fn(() => ({ ok: true })),
    setSelectedShopShelfFutureItem: vi.fn(() => ({ ok: true })),
  };
  const playerFacade = {
    getSnapshot: vi.fn(() => ({
      username: 'elara',
      character: 'elara',
    })),
    subscribe: vi.fn(() => vi.fn()),
  };
  const dependencies = {
    renderFacade,
    gameplayFacade,
    playerFacade,
    worldChatFacade: createSnapshotFacade({ connected: true, messages: [] }),
    playerShopFacade: createSnapshotFacade({ connected: false }),
    tradeAllianceFacade: createSnapshotFacade({ connected: false }),
  };

  return {
    dependencies,
    factories,
    runtime,
    gameplayFacade,
    bottomSurface,
    pageSurface,
    getPageSwipeRegistration: () => pageSwipeRegistration,
    getBoundPage: (pageId) => boundPages.get(pageId),
    getBoundGlobal: (surfaceId) => boundGlobals.get(surfaceId),
  };
}

function createSnapshotFacade(snapshot) {
  return {
    getSnapshot: vi.fn(() => snapshot),
    subscribe: vi.fn(() => vi.fn()),
  };
}

function createInventoryRows(kind, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${kind}-${index + 1}`,
    itemTypeId: index + 1,
    kind,
    key: `${kind}-${index + 1}`,
    label: `${kind} ${index + 1}`,
    quantity: 1,
    availableQuantity: 1,
  }));
}

function createGameplaySnapshot({ level = 20 } = {}) {
  return {
    mana: { current: 10, cap: 20, perSecond: 1 },
    coin: { current: 1_000 },
    crystal: { current: 10 },
    ruby: { current: 2 },
    emerald: { current: 1 },
    seedSummoning: { cost: 2, quantity: 1, canSummon: true },
    playerLevel: { currentLevel: level },
    tasks: {
      currentLevel: level,
      level: {
        tasks: [],
        completion: { canComplete: false },
        questProgress: { completedQuests: 0, totalQuests: 4 },
      },
    },
    prestige: {
      currentLevel: level,
      completedLevels: [],
      milestones: [],
      unlocks: [],
    },
    research: { tabs: [] },
    brewing: { cauldrons: [], recipes: [], herbs: [] },
    garden: { plot: { tiles: [], maxTiles: 0 }, herbs: [], seeds: [] },
    shop: {},
    guild: {
      unlocked: level >= 15,
      created: false,
      unlockLevel: 15,
    },
  };
}

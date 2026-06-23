import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../../ecs/EcsFacade.js';
import { GameplayFacade } from '../../gameplay/GameplayFacade.js';
import { DevCheatsFacade } from './DevCheatsFacade.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createApp({
  backendFacade,
  pagesFacade,
  persistenceStorage = createMemoryStorage(),
} = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceStorage, persistenceNow: () => 0 });
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  return { ecsFacade, app: { backendFacade, gameplayFacade, pagesFacade }, persistenceStorage };
}

describe('DevCheatsFacade', () => {
  it('registers console helpers and restores previous globals', () => {
    const { app } = createApp();
    const target = {
      cheats: { previous: true },
      cheat: () => 'previous',
    };
    const logger = { info: vi.fn() };
    const facade = new DevCheatsFacade({ app, target, logger });

    facade.mount();

    expect(target.cheats.help()).toMatchObject({ ok: true });
    expect(target.cheat('addCoin 25')).toMatchObject({ ok: true });
    expect(app.gameplayFacade.getSnapshot().coin.current).toBe(25);
    expect(logger.info).toHaveBeenCalledWith('Dev cheats enabled. Run cheats.help().');

    facade.unmount();

    expect(target.cheats).toEqual({ previous: true });
    expect(target.cheat()).toBe('previous');
  });

  it('mutates gameplay through explicit cheat commands', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.fillMana()).toMatchObject({
      ok: true,
      mana: { current: 50, cap: 50 },
    });
    expect(target.cheats.addCoin(100)).toMatchObject({
      ok: true,
      coin: { current: 100, totalGenerated: 100 },
    });
    expect(target.cheats.addCrystal(7)).toMatchObject({
      ok: true,
      crystal: { current: 7 },
    });
    expect(target.cheats.addEmerald(2)).toMatchObject({
      ok: true,
      emerald: { current: 2 },
    });
    expect(target.cheats.addItem('sageSeed', 3)).toMatchObject({
      ok: true,
      item: {
        key: 'sageSeed',
        quantity: 3,
      },
      addedQuantity: 3,
    });
    expect(target.cheats.unlockSeed('sage')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
    });
    expect(target.cheats.unlockFeature('recipe:manaTonic')).toMatchObject({
      ok: true,
      researchId: 'unlockRecipe:manaTonic',
    });

    const snapshot = target.cheats.snapshot().snapshot;
    expect(snapshot.inventory).toContainEqual(
      expect.objectContaining({ key: 'sageSeed', quantity: 3 }),
    );
    expect(snapshot.emerald.current).toBe(2);
    expect(snapshot.research.completedResearchIds).toContain('unlockSeed:sageSeed');
    expect(snapshot.research.completedResearchIds).toContain('unlockRecipe:manaTonic');
  });

  it('sets level-gated garden views directly', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.unlockPlots(8)).toMatchObject({
      ok: true,
      unlockedTiles: 8,
      currentLevel: 10,
    });
    expect(target.cheats.setPlot(1, { seed: 'sage', phase: 'growing', progress: 0.5 }))
      .toMatchObject({
        ok: true,
        tile: {
          tileNumber: 1,
          seedKey: 'sageSeed',
          herbKey: 'sageHerb',
          phase: 'growing',
          progress: 0.5,
        },
      });
    expect(target.cheats.setPlot(2, { seed: 'mint', phase: 'ready' })).toMatchObject({
      ok: true,
      tile: {
        tileNumber: 2,
        seedKey: 'mintSeed',
        herbKey: 'mintHerb',
        phase: 'ready',
      },
    });

    const snapshot = target.cheats.snapshot().snapshot;
    expect(snapshot.playerLevel.currentLevel).toBe(10);
    expect(snapshot.garden.plot.unlockedTiles).toBe(8);
  });

  it('unlocks all feature gates and direct-state surfaces', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.unlockAllFeatures()).toMatchObject({
      ok: true,
      level: 100,
      garden: {
        unlockedTiles: 20,
      },
      cauldrons: {
        unlockedCauldrons: 10,
      },
      market: {
        trader: { unlockedSlots: 5 },
        player: { unlockedSlots: 5 },
      },
    });

    const snapshot = target.cheats.snapshot().snapshot;
    expect(snapshot.research.completedResearchIds).toContain('unlockRecipe:manaTonic');
    expect(snapshot.research.completedResearchIds.length).toBeGreaterThan(10);
    expect(snapshot.shop.shelf.unlockedSlots).toBe(5);
    expect(snapshot.shop.playerShelf.unlockedSlots).toBe(5);
  });

  it('sets cauldron views directly', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.setCauldron(1, { potion: 'manaTonic', phase: 'brewed' }))
      .toMatchObject({
        ok: true,
        cauldron: {
          cauldronNumber: 1,
          activeBrew: {
            key: 'manaTonic',
            phase: 'brewed',
          },
        },
      });
  });

  it('bridges tutorial stages through pages facade', () => {
    const pagesFacade = {
      listTutorialStages: vi.fn(() => ({
        ok: true,
        stages: ['purchase-house', 'intro-garden'],
      })),
      setTutorialStage: vi.fn((stageId) => ({
        ok: true,
        stage: stageId,
        completedStepIds: ['purchase-house'],
      })),
    };
    const { app } = createApp({ pagesFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.listTutorialStages()).toMatchObject({
      ok: true,
      stages: ['purchase-house', 'intro-garden'],
    });
    expect(target.cheats.setTutorialStage('intro-garden')).toEqual({
      ok: true,
      stage: 'intro-garden',
      completedStepIds: ['purchase-house'],
    });
    expect(pagesFacade.setTutorialStage).toHaveBeenCalledWith('intro-garden');
  });

  it('publishes dummy leaderboard snapshots through backend dev overrides', () => {
    const leaderboardFacade = {
      setDevSnapshot: vi.fn((snapshot) => ({ ok: true, snapshot })),
      clearDevSnapshot: vi.fn(() => ({ ok: true })),
    };
    const worldEventLeaderboardFacade = {
      setDevSnapshot: vi.fn((snapshot) => ({ ok: true, snapshot })),
      clearDevSnapshot: vi.fn(() => ({ ok: true })),
    };
    const backendFacade = {
      getLeaderboardFacade: () => leaderboardFacade,
      getWorldEventLeaderboardFacade: () => worldEventLeaderboardFacade,
    };
    const { app } = createApp({ backendFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.setDummyLeaderboard({ count: 3 })).toMatchObject({
      ok: true,
      snapshot: {
        topDailyUsers: [{ rank: 1 }, { rank: 2 }, { rank: 3 }],
      },
      eventSnapshot: {
        connected: true,
        topWorldEventUsers: [{ rank: 1 }, { rank: 2 }, { rank: 3 }],
      },
    });
    expect(leaderboardFacade.setDevSnapshot).toHaveBeenCalledTimes(1);
    expect(worldEventLeaderboardFacade.setDevSnapshot).toHaveBeenCalledTimes(1);

    expect(target.cheats.clearDummyLeaderboard()).toMatchObject({ ok: true });
    expect(leaderboardFacade.clearDevSnapshot).toHaveBeenCalledTimes(1);
    expect(worldEventLeaderboardFacade.clearDevSnapshot).toHaveBeenCalledTimes(1);
  });

  it('loads QA data templates through console helpers', async () => {
    const originalFetch = globalThis.fetch;
    const { app } = createApp();
    const save = app.gameplayFacade.createPersistenceSave();
    save.coin = { current: 42, totalGenerated: 42 };
    const manifest = {
      templates: [
        {
          id: 'ftwizard',
          aliases: ['everything-unlocked'],
          label: 'Ftwizard (level 15)',
          username: 'Ftwizard',
          level: 15,
          path: '/qa-data/templates/ftwizard.json',
        },
      ],
      aliases: {
        'everything-unlocked': 'ftwizard',
      },
    };
    const fetch = vi.fn((path) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () =>
          path.endsWith('/manifest.json')
            ? manifest
            : {
                save,
              },
      }),
    );
    const target = {};
    globalThis.fetch = fetch;
    const facade = new DevCheatsFacade({ app, target, logger: null });

    try {
      facade.mount();

      await expect(target.cheats.listDataTemplates()).resolves.toMatchObject({
        ok: true,
        templates: [
          {
            id: 'ftwizard',
            level: 15,
          },
        ],
      });
      await expect(
        target.cheats.loadDataTemplate('everything-unlocked'),
      ).resolves.toMatchObject({
        ok: true,
        template: 'ftwizard',
      });
      expect(app.gameplayFacade.getSnapshot().coin.current).toBe(42);
    } finally {
      facade.unmount();
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects unknown items and research ids', () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();

    expect(target.cheats.addItem('missingItem', 1)).toEqual({
      ok: false,
      reason: 'unknown_item',
      itemKeyOrId: 'missingItem',
    });
    expect(target.cheats.completeResearch('missingResearch')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'missingResearch',
    });
  });

  it('requires confirmation before resetting data', async () => {
    const { app } = createApp();
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.addCoin(50);

    await expect(target.cheats.resetData()).resolves.toEqual({
      ok: false,
      reason: 'confirmation_required',
      confirmation: 'RESET',
    });
    expect(app.gameplayFacade.getSnapshot().coin.current).toBe(50);
  });

  it('resets gameplay data and clears server player-market progress', async () => {
    const clearOwnProgress = vi.fn(() => Promise.resolve({ ok: true }));
    const backendFacade = {
      getGameplaySaveFacade: () => ({
        getSnapshot: () => ({ connected: true }),
      }),
      getPlayerShopFacade: () => ({
        clearOwnProgress,
      }),
    };
    const { app, persistenceStorage } = createApp({ backendFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.fillMana();
    target.cheats.addCoin(100);
    target.cheats.addCrystal(7);
    target.cheats.addItem('sageSeed', 3);
    target.cheats.unlockSeed('sage');

    await expect(target.cheats.resetData('RESET')).resolves.toMatchObject({
      ok: true,
      scope: 'gameplay_progress',
      playerShop: { ok: true },
      snapshot: {
        mana: { current: 0, cap: 50, perSecond: 1 },
        coin: { current: 0, totalGenerated: 0 },
        crystal: { current: 0 },
        emerald: { current: 0 },
        inventory: [],
        research: { completedResearchIds: ['unlockSeed:sageSeed'] },
      },
    });
    expect(clearOwnProgress).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    expect(saved).toMatchObject({
      version: 7,
      coin: { current: 0, totalGenerated: 0 },
      crystal: { current: 0 },
      emerald: { current: 0 },
      ruby: { current: 0 },
      inventory: [],
      research: { completedIds: ['unlockSeed:sageSeed'] },
      prestige: { completedLevels: [] },
    });
  });

  it('does not reset while the backend save is not ready', async () => {
    const backendFacade = {
      getGameplaySaveFacade: () => ({
        getSnapshot: () => ({ connected: false }),
      }),
    };
    const { app } = createApp({ backendFacade });
    const target = {};
    const facade = new DevCheatsFacade({ app, target, logger: null });

    facade.mount();
    target.cheats.addCoin(50);

    await expect(target.cheats.resetData('RESET')).resolves.toEqual({
      ok: false,
      reason: 'backend_save_not_ready',
    });
    expect(app.gameplayFacade.getSnapshot().coin.current).toBe(50);
  });
});

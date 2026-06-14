import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { automationResearchIds } from './automation/automationResearchIds.js';
import { GameplayFacade } from './GameplayFacade.js';
import { DEFAULT_PLAYER_LEVEL_BALANCE } from './playerLevel/managers/PlayerLevelBalanceManager.js';
import { advancedResearchIds } from './research/advancedResearchIds.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createGameplay({
  instantResearch = true,
  persistenceStorage,
  persistenceNow = () => 0,
} = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceStorage, persistenceNow });
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  if (instantResearch) {
    makeResearchInstant(gameplayFacade);
  }
  gameplayFacade.setNpcMarketFacade(createNpcMarketFacadeFake(gameplayFacade));
  return { ecsFacade, gameplayFacade };
}

function makeResearchInstant(gameplayFacade) {
  const researchConfigs = gameplayFacade.researchFacade.researchDefinitionManager
    .getResearches({ includeLevelLockedAutomation: true })
    .map((research) => ({
      researchId: research.id,
      costGold: gameplayFacade.researchFacade.researchBalanceManager.getCostGold(research.id),
      durationSeconds: 0,
      enabled: true,
    }));

  gameplayFacade.applyRuntimeConfig({ researchConfigs });
}

function createNpcMarketFacadeFake(gameplayFacade) {
  return {
    getNpcBuyPriceGold(itemKey) {
      return gameplayFacade.itemsFacade.safeGetDefinitionByKey(itemKey)?.baseSellPrice ?? null;
    },
    getNpcNeed() {
      return 1000;
    },
    sellToNpc() {
      return Promise.resolve({ ok: true });
    },
  };
}

function unlockSageSeed(gameplayFacade) {
  return gameplayFacade.buyResearch('unlockSeed:sageSeed');
}

function finishCurrentTaskLevel(gameplayFacade) {
  const tasks = gameplayFacade.getSnapshot().tasks.level.tasks;

  for (const task of tasks) {
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);
    gameplayFacade.fillTask(task.taskId);
    gameplayFacade.completeTask(task.taskId);
  }

  gameplayFacade.goldFacade.add(gameplayFacade.getSnapshot().tasks.level.completion.costGold);
  gameplayFacade.completeTaskLevel();
}

function advanceToLevel(gameplayFacade, targetLevel) {
  while (gameplayFacade.getSnapshot().tasks.currentLevel < targetLevel) {
    finishCurrentTaskLevel(gameplayFacade);
  }
}

describe('GameplayFacade', () => {
  it('persists gameplay progress across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.goldFacade.add(12);
    first.gameplayFacade.crystalFacade.add(2);
    first.gameplayFacade.itemsFacade.addItem(1, 3);
    first.gameplayFacade.itemsFacade.addItem(1001, 2);
    first.gameplayFacade.buyResearch('unlockSeed:sageSeed');
    first.gameplayFacade.buyVisualSettingOption('theme', 'black');
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.setSelectedShopShelfSlotSellItem(1);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.gold.current).toBe(12);
    expect(snapshot.gold.totalGenerated).toBe(12);
    expect(snapshot.crystal.current).toBe(2);
    expect(snapshot.logs.entries).toContainEqual(
      expect.objectContaining({
        message: 'researched sage seed',
      }),
    );
    expect(snapshot.inventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 3,
    });
    expect(snapshot.research.completedResearchIds).toEqual(['unlockSeed:sageSeed']);
    expect(snapshot.visualSettings.researched.theme.black).toBe(true);
    expect(snapshot.brewing.ingredients).toEqual([
      {
        slotIndex: 0,
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
      },
    ]);
    expect(snapshot.shop.shelf.slots[0]).toMatchObject({
      slotNumber: 1,
      sellItemTypeId: 1,
      sellKind: 'seed',
      sellLabel: 'sage seed',
    });
  });

  it('clamps restored garden and market capacity to the saved player level', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        gold: {},
        crystal: {},
        logs: {},
        inventory: [],
        research: {
          completedIds: [],
        },
        shop: {
          shelf: {
            unlockedSlots: 5,
            slots: [],
          },
          playerShelf: {
            unlockedSlots: 5,
            slots: [],
          },
        },
        brewing: {},
        garden: {
          unlockedTiles: 10,
          tiles: [],
        },
        tasks: {
          currentLevel: 1,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const snapshot = gameplayFacade.getSnapshot();

    expect(snapshot.garden.plot.unlockedTiles).toBe(2);
    expect(snapshot.shop.shelf.unlockedSlots).toBe(1);
    expect(snapshot.shop.playerShelf.unlockedSlots).toBe(1);
  });

  it('fills tasks from inventory and advances player level after gold payment', () => {
    const { gameplayFacade } = createGameplay();
    const [task] = gameplayFacade.getSnapshot().tasks.level.tasks;

    expect(gameplayFacade.getSnapshot().tasks.maxLevel).toBe(20);
    expect(gameplayFacade.getSnapshot().tasks.level.totalTasks).toBe(5);
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, 12);

    expect(gameplayFacade.fillTask(task.taskId)).toMatchObject({
      ok: true,
      quantity: 12,
      progressQuantity: 12,
      requiredQuantity: task.requiredQuantity,
      maxed: false,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.completeTask(task.taskId)).toEqual({
      ok: false,
      reason: 'not_ready',
      taskId: task.taskId,
    });

    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);

    expect(gameplayFacade.fillTask(task.taskId)).toMatchObject({
      ok: true,
      quantity: task.requiredQuantity - 12,
      progressQuantity: task.requiredQuantity,
      maxed: true,
    });
    expect(gameplayFacade.completeTask(task.taskId)).toMatchObject({
      ok: true,
      currentLevel: 1,
      advanced: false,
    });

    const remainingTasks = gameplayFacade.getSnapshot().tasks.level.tasks.filter(
      (candidate) => !candidate.completed,
    );

    for (const remainingTask of remainingTasks) {
      gameplayFacade.itemsFacade.addItem(
        remainingTask.itemTypeId,
        remainingTask.requiredQuantity,
      );
      expect(gameplayFacade.fillTask(remainingTask.taskId)).toMatchObject({
        ok: true,
        maxed: true,
      });
      gameplayFacade.completeTask(remainingTask.taskId);
    }

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(1);
    expect(gameplayFacade.getSnapshot().tasks.level.completion).toMatchObject({
      level: 1,
      costGold: 20,
      canComplete: true,
    });
    expect(gameplayFacade.completeTaskLevel()).toMatchObject({
      ok: false,
      reason: 'not_enough_gold',
      costGold: 20,
    });

    gameplayFacade.goldFacade.add(20);
    expect(gameplayFacade.completeTaskLevel()).toMatchObject({
      ok: true,
      currentLevel: 2,
      advanced: true,
      costGold: 20,
    });
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().tasks.level.totalTasks).toBe(5);
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
  });

  it('persists task progress and player level', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    finishCurrentTaskLevel(first.gameplayFacade);
    const [task] = first.gameplayFacade.getSnapshot().tasks.level.tasks;
    first.gameplayFacade.itemsFacade.addItem(task.itemTypeId, 3);
    first.gameplayFacade.fillTask(task.taskId);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.tasks.currentLevel).toBe(2);
    expect(snapshot.tasks.level.tasks[0]).toMatchObject({
      taskId: task.taskId,
      progressQuantity: 3,
      completed: false,
    });
  });

  it('adds mana cap and regen when player level advances', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().mana).toMatchObject({
      cap: 50,
      perSecond: 1,
    });

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().mana.cap).toBe(100);
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBeCloseTo(2);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().mana.cap).toBe(150);
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBeCloseTo(3);
  });

  it('grants configured crystal when player level advances', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(0);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);
  });

  it('shows prestige milestones through level 100 with special ruby rewards', () => {
    const { gameplayFacade } = createGameplay();
    const milestones = gameplayFacade.getSnapshot().prestige.milestones;

    expect(milestones.slice(0, 3).map((milestone) => milestone.level)).toEqual([
      10,
      20,
      30,
    ]);
    expect(milestones.find((milestone) => milestone.level === 10)).toMatchObject({
      rewardRuby: 1,
      canComplete: false,
      completed: false,
    });
    expect(milestones.find((milestone) => milestone.level === 50)?.rewardRuby).toBe(2);
    expect(milestones.find((milestone) => milestone.level === 100)?.rewardRuby).toBe(5);
  });

  it('completes prestige, resets run data, and keeps visual unlocks plus prestige rubies', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.crystalFacade.add(4);
    gameplayFacade.goldFacade.add(99);
    gameplayFacade.itemsFacade.addItem(1, 5);
    gameplayFacade.buyVisualSettingOption('theme', 'black');
    gameplayFacade.buyResearch('unlockSeed:sageSeed');
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1);
    advanceToLevel(gameplayFacade, 10);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(10);
    expect(gameplayFacade.getSnapshot().prestige.highestAvailableLevel).toBe(10);

    const result = gameplayFacade.completePrestigeMilestone(10);
    const snapshot = gameplayFacade.getSnapshot();

    expect(result).toMatchObject({
      ok: true,
      milestone: {
        level: 10,
        rewardRuby: 1,
      },
      currentRuby: 1,
    });
    expect(snapshot.tasks.currentLevel).toBe(1);
    expect(snapshot.prestige.completedLevels).toEqual([10]);
    expect(snapshot.prestige.earnedRuby).toBe(1);
    expect(snapshot.ruby.current).toBe(1);
    expect(snapshot.gold).toMatchObject({ current: 0, totalGenerated: 0 });
    expect(snapshot.crystal.current).toBe(0);
    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.research.completedResearchIds).toEqual([]);
    expect(snapshot.brewing.ingredients).toEqual([]);
    expect(snapshot.shop.shelf.selectedSlotNumber).toBe(1);
    expect(snapshot.logs.entries).toEqual([]);
    expect(snapshot.visualSettings.researched.theme.black).toBe(true);
    expect(snapshot.mana).toMatchObject({
      current: 0,
      cap: 50,
      perSecond: 1,
    });
  });

  it('persists prestige reset data with only settings and prestige progress kept', () => {
    const persistenceStorage = createMemoryStorage();
    const { gameplayFacade } = createGameplay({ persistenceStorage });

    gameplayFacade.crystalFacade.add(4);
    gameplayFacade.goldFacade.add(99);
    gameplayFacade.buyVisualSettingOption('theme', 'black');
    gameplayFacade.buyResearch('unlockSeed:sageSeed');
    advanceToLevel(gameplayFacade, 10);

    gameplayFacade.completePrestigeMilestone(10);

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    expect(saved).toMatchObject({
      gold: { current: 0, totalGenerated: 0 },
      crystal: { current: 0 },
      ruby: { current: 1 },
      inventory: [],
      research: { completedIds: [] },
      prestige: { completedLevels: [10] },
      visualSettings: {
        researched: {
          theme: {
            black: true,
          },
        },
      },
      tasks: {
        currentLevel: 1,
      },
    });
  });

  it('requires confirmation when a higher prestige milestone is available', () => {
    const { gameplayFacade } = createGameplay();
    advanceToLevel(gameplayFacade, 20);

    expect(gameplayFacade.completePrestigeMilestone(10)).toMatchObject({
      ok: false,
      reason: 'higher_prestige_available',
      highestAvailableLevel: 20,
    });

    expect(gameplayFacade.completePrestigeMilestone(10, { confirmedLower: true })).toMatchObject({
      ok: true,
      milestone: {
        level: 10,
      },
    });
    expect(gameplayFacade.getSnapshot().prestige.completedLevels).toEqual([10]);
  });

  it('derives loaded ruby from completed prestiges minus completed ruby research cost', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        gold: {},
        crystal: { current: 0 },
        ruby: { current: 9 },
        inventory: [],
        prestige: {
          completedLevels: [10, 20],
        },
        research: {
          completedIds: [advancedResearchIds.cauldronBrewing(1, 1)],
        },
        tasks: {
          currentLevel: 3,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().prestige.earnedRuby).toBe(2);
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(1);
  });

  it('backfills missed level crystals when loading old saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        gold: {},
        crystal: { current: 0 },
        inventory: [],
        research: { completedIds: [] },
        tasks: {
          currentLevel: 3,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);
  });

  it('does not duplicate existing level crystals when loading saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        gold: {},
        crystal: { current: 2 },
        inventory: [],
        research: { completedIds: [] },
        tasks: {
          currentLevel: 3,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);
  });

  it('counts spent crystal research when backfilling old saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        gold: {},
        crystal: { current: 0 },
        inventory: [],
        research: {
          completedIds: [automationResearchIds.autoPlantTile(1)],
        },
        tasks: {
          currentLevel: 3,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);
  });

  it('uses runtime player-level config for crystal level-up rewards', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'playerLevel',
          configJson: JSON.stringify({
            ...DEFAULT_PLAYER_LEVEL_BALANCE,
            crystal: {
              perLevel: 3,
            },
          }),
        },
      ],
    });

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);
  });

  it('keeps crystal level-up rewards when legacy runtime config omits crystal', () => {
    const { crystal, ...legacyPlayerLevelBalance } = DEFAULT_PLAYER_LEVEL_BALANCE;
    const { gameplayFacade } = createGameplay();

    expect(crystal.perLevel).toBe(1);

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'playerLevel',
          configJson: JSON.stringify(legacyPlayerLevelBalance),
        },
      ],
    });

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);
  });

  it('uses SpacetimeDB runtime config for balance and catalog data', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'garden',
          configJson: JSON.stringify({
            garden: {
              initialUnlockedTiles: 1,
              tileCostsGold: [0, 11],
              tilesPerRow: 2,
              harvestSeconds: 7,
            },
          }),
        },
        {
          configKey: 'shop',
          configJson: JSON.stringify({
            shopShelf: {
              initialUnlockedSlots: 1,
              slotCostsGold: [0, 22],
              autoSellSeconds: 3,
            },
          }),
        },
        {
          configKey: 'brewing',
          configJson: JSON.stringify({
            wastedBrewManaCost: 9,
            wastedBrewDurationMs: 8_000,
            bottlingDurationMs: 1_500,
            maxCauldronIngredients: 3,
            wastedPotionKey: 'manaTonic',
          }),
        },
        {
          configKey: 'items',
          configJson: JSON.stringify({
            seeds: [
              {
                id: 1,
                key: 'sageSeed',
                label: 'config sage seed',
                producesHerbTypeId: 1001,
                dropWeight: 2,
                summonManaCost: 4,
                baseSellPrice: 1,
              },
            ],
            herbs: [
              {
                id: 1001,
                key: 'sageHerb',
                label: 'config sage',
                growthDurationMs: 12_345,
                baseSellPrice: 8,
              },
            ],
            potions: [
              {
                id: 2001,
                key: 'manaTonic',
                label: 'config tonic',
                baseSellPrice: 44,
              },
            ],
          }),
        },
        {
          configKey: 'potionRecipes',
          configJson: JSON.stringify({
            recipes: [
              {
                potionKey: 'manaTonic',
                manaCost: 6,
                brewDurationMs: 7_000,
                ingredients: [{ itemKey: 'sageHerb', quantity: 1 }],
              },
            ],
          }),
        },
      ],
    });

    const snapshot = gameplayFacade.getSnapshot();

    expect(snapshot.seedSummoning.cost).toBe(4);
    expect(snapshot.garden.plot).toMatchObject({
      tileCosts: [0, 11],
      tilesPerRow: 2,
      harvestSeconds: 7,
    });
    expect(snapshot.garden.seeds[0]).toMatchObject({
      key: 'sageSeed',
      label: 'config sage seed',
    });
    expect(snapshot.shop.shelf).toMatchObject({
      slotCosts: [0, 22],
      autoSellSeconds: 3,
    });
    expect(snapshot.brewing).toMatchObject({
      manaCost: 9,
      maxIngredients: 3,
    });
    expect(snapshot.brewing.recipes[0]).toMatchObject({
      key: 'manaTonic',
      label: 'config tonic',
      manaCost: 6,
      brewDurationMs: 7_000,
    });
  });

  it('logs completed gameplay events', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id);
    ecsFacade.update({ deltaSeconds: 5 });

    gameplayFacade.itemsFacade.addItem(1001, 2);
    gameplayFacade.itemsFacade.addItem(1002, 1);
    ecsFacade.update({ deltaSeconds: 5 });
    gameplayFacade.addBrewingIngredient(1002);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.brewCauldron();
    ecsFacade.update({ deltaSeconds: 6 });
    gameplayFacade.startBrewingBottling();
    ecsFacade.update({ deltaSeconds: 2 });
    gameplayFacade.collectBrewingPotion();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.plantGardenSeed(1, 1);
    ecsFacade.update({ deltaSeconds: 60 });
    gameplayFacade.startGardenHarvest(1);
    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toEqual([
      'researched sage seed',
      'summoned sage seed',
      'sold sage seed for 1 gold',
      'brewed wasted potion',
      'planted sage seed',
      'harvested sage',
    ]);
    expect(rewardEvents.map((event) => event.type)).toEqual([
      'seed_summoned',
      'item_sold',
      'potion_collected',
      'herb_harvested',
    ]);
    expect(rewardEvents[0]).toMatchObject({
      type: 'seed_summoned',
      seed: { label: 'sage seed' },
      quantity: 1,
    });
    expect(rewardEvents[1]).toMatchObject({
      type: 'item_sold',
      item: { label: 'sage seed' },
      gold: 1,
    });
    expect(rewardEvents[2]).toMatchObject({
      type: 'potion_collected',
      potion: { label: 'wasted potion' },
      quantity: 1,
    });
    expect(rewardEvents[3]).toMatchObject({
      type: 'herb_harvested',
      herb: { label: 'sage' },
      quantity: 1,
    });
    unsubscribeRewardEvents();
  });

  it('ignores corrupt gameplay saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem('idle-wizard.gameplay.save', '{broken');

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot()).toMatchObject({
      gold: { current: 0 },
      crystal: { current: 0 },
      inventory: [],
      research: { completedResearchIds: [] },
    });
  });

  it('migrates version 1 gameplay saves without wiping progress', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 1,
        gold: {
          current: 12,
          totalGenerated: 18,
        },
        inventory: [
          {
            itemKey: 'sageSeed',
            quantity: 3,
          },
        ],
        research: {
          completedIds: ['unlockSeed:sageSeed'],
        },
        visualSettings: {
          researched: {
            theme: {
              black: true,
            },
          },
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const snapshot = gameplayFacade.getSnapshot();

    expect(snapshot.gold.current).toBe(12);
    expect(snapshot.gold.totalGenerated).toBe(18);
    expect(snapshot.inventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 3,
    });
    expect(snapshot.research.completedResearchIds).toEqual(['unlockSeed:sageSeed']);
    expect(snapshot.visualSettings.researched.theme.black).toBe(true);
    expect(snapshot.tasks.currentLevel).toBe(1);
    expect(snapshot.tasks.level.tasks).toHaveLength(5);
    expect(gameplayFacade.consumeProgressResetPending()).toBe(false);
  });

  it('persists active brew timers across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.itemsFacade.addItem(1001, 3);
    first.gameplayFacade.goldFacade.add(80);
    first.gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    first.ecsFacade.update({ deltaSeconds: 12 });
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.brewCauldron();
    first.ecsFacade.update({ deltaSeconds: 1 });
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      resultItemTypeId: 2001,
      key: 'manaTonic',
      remainingMs: 29_000,
      totalMs: 30_000,
    });

    second.ecsFacade.update({ deltaSeconds: 29 });

    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'brewed',
      canStartBottling: true,
      remainingMs: 0,
      totalMs: 30_000,
    });
    expect(second.gameplayFacade.getSnapshot().inventory).toEqual([]);

    expect(second.gameplayFacade.startBrewingBottling()).toMatchObject({
      ok: true,
      durationMs: 2_000,
    });
    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'bottling',
      remainingMs: 2_000,
      totalMs: 2_000,
    });

    second.ecsFacade.update({ deltaSeconds: 2 });

    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'ready',
      canCollect: true,
    });
    expect(second.gameplayFacade.collectBrewingPotion()).toMatchObject({
      ok: true,
      potion: {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        kind: 'potion',
      },
    });
    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(second.gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
  });

  it('catches up active brew timers from save time', () => {
    let now = 0;
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });

    first.gameplayFacade.itemsFacade.addItem(1001, 3);
    first.gameplayFacade.goldFacade.add(80);
    first.gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    first.ecsFacade.update({ deltaSeconds: 12 });
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.brewCauldron();
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    now = 31_000;
    const second = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });

    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'brewed',
      canStartBottling: true,
      remainingMs: 0,
      totalMs: 30_000,
    });
  });

  it('drops removed mana research effects from legacy saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {
          current: 20,
          cap: 100,
          perSecond: 2,
        },
        gold: {},
        crystal: {},
        logs: {},
        inventory: [],
        research: {
          completedIds: ['manaProductionRate:1', 'manaSphereCap:1'],
        },
        shop: {},
        brewing: {},
        garden: {},
        tasks: {
          currentLevel: 1,
          tasks: [],
        },
      }),
    );

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([]);
    expect(second.gameplayFacade.getSnapshot().mana).toMatchObject({
      current: 20,
      cap: 50,
      perSecond: 1,
    });
  });

  it('generates mana up to the mana cap', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    ecsFacade.update({ deltaSeconds: 1_000 });

    expect(gameplayFacade.getSnapshot().mana).toEqual({
      current: 50,
      cap: 50,
      perSecond: 1,
    });
  });

  it('exposes crystal as hard currency', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().crystal).toEqual({
      current: 0,
    });

    gameplayFacade.crystalFacade.add(5);

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(5);
    expect(gameplayFacade.crystalFacade.spend(2)).toBe(true);
    expect(gameplayFacade.crystalFacade.spend(4)).toBe(false);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);
  });

  it('researches visual settings from runtime config and spends crystal', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'visualSettings',
          configJson: JSON.stringify({
            costsCrystal: {
              theme: { white: 0, black: 2, midnight: 0, witchcraft: 0 },
              font: { lexend: 0, 'comic-sans-mono': 0 },
              color: { monochrome: 0, resources: 0 },
              progressBar: { regular: 0, gradient: 0 },
              icons: { none: 0, icons: 0 },
            },
          }),
        },
      ],
    });

    expect(gameplayFacade.getSnapshot().visualSettings.costsCrystal.theme.black).toBe(2);
    expect(gameplayFacade.getSnapshot().visualSettings.researched).toMatchObject({
      theme: { white: true, black: false, midnight: false, witchcraft: false },
      font: {
        lexend: true,
        'comic-sans-mono': false,
      },
      color: { monochrome: true, resources: false },
      progressBar: { regular: true, gradient: false },
      icons: { none: true, icons: false },
    });
    expect(gameplayFacade.buyVisualSettingOption('theme', 'black')).toEqual({
      ok: false,
      reason: 'not_enough_crystal',
      category: 'theme',
      optionKey: 'black',
      costCrystal: 2,
      costCurrency: 'crystal',
    });

    gameplayFacade.crystalFacade.add(2);

    expect(gameplayFacade.buyVisualSettingOption('theme', 'black')).toEqual({
      ok: true,
      category: 'theme',
      optionKey: 'black',
      costCrystal: 2,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(0);
    expect(gameplayFacade.getSnapshot().visualSettings.researched.theme.black).toBe(true);
    expect(gameplayFacade.buyVisualSettingOption('theme', 'black')).toEqual({
      ok: false,
      reason: 'already_researched',
      category: 'theme',
      optionKey: 'black',
      costCrystal: 2,
      costCurrency: 'crystal',
    });
  });

  it('spends mana to summon a seed into inventory', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(unlockSageSeed(gameplayFacade)).toEqual({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
      cost: 0,
    });
    ecsFacade.update({ deltaSeconds: 10 });
    expect(gameplayFacade.getSnapshot().seedSummoning.canSummon).toBe(true);
    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(10);
    expect(result.quantity).toBe(1);
    expect(result.seed.dropWeight).toBe(1);
    expect(result.seed.key).toBe('sageSeed');
    expect(snapshot.mana.current).toBe(0);
    expect(result.seed.label).toMatch(/seed$/);
    expect(snapshot.inventory).toEqual([
      {
        itemTypeId: result.seed.id,
        key: result.seed.key,
        label: result.seed.label,
        kind: 'seed',
        quantity: 1,
      },
    ]);
    expect(snapshot.seedInventory).toHaveLength(14);
    expect(snapshot.seedInventory).toContainEqual(
      {
        itemTypeId: result.seed.id,
        key: result.seed.key,
        label: result.seed.label,
        kind: 'seed',
        quantity: 1,
      },
    );
  });

  it('uses completed summon research as the active seed summon multiplier', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.goldFacade.add(300);
    expect(gameplayFacade.buyResearch('summonSeedsX2')).toEqual({
      ok: true,
      researchId: 'summonSeedsX2',
      cost: 300,
    });
    ecsFacade.update({ deltaSeconds: 20 });

    expect(gameplayFacade.getSnapshot().seedSummoning).toEqual({
      cost: 20,
      quantity: 2,
      canSummon: true,
    });

    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(20);
    expect(result.quantity).toBe(2);
    expect(result.seedCounts).toEqual([
      {
        seed: result.seed,
        quantity: 2,
      },
    ]);
    expect(snapshot.mana.current).toBe(0);
    expect(snapshot.inventory).toEqual([
      {
        itemTypeId: result.seed.id,
        key: result.seed.key,
        label: result.seed.label,
        kind: 'seed',
        quantity: 2,
      },
    ]);
  });

  it('rejects seed summoning when no seed unlock research is completed', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    ecsFacade.update({ deltaSeconds: 10 });
    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result).toEqual({
      ok: false,
      reason: 'no_summonable_seeds',
      cost: 10,
    });
    expect(snapshot.mana.current).toBe(10);
    expect(snapshot.seedSummoning.canSummon).toBe(false);
    expect(snapshot.inventory).toEqual([]);
  });

  it('rejects seed summoning without enough mana', () => {
    const { gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    const result = gameplayFacade.summonSeed();

    expect(result).toEqual({
      ok: false,
      reason: 'not_enough_mana',
      cost: 10,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().seedInventory).toHaveLength(14);
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual(
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 0,
      },
    );
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 14,
      key: 'dragonpepperSeed',
      label: 'dragonpepper seed',
      kind: 'seed',
      quantity: 0,
    });
  });

  it('exposes research boxes for seeds, summon counts, and recipes', () => {
    const { gameplayFacade } = createGameplay();
    const research = gameplayFacade.getSnapshot().research;

    expect(research.tabs.map((tab) => tab.id)).toEqual([
      'regular',
      'automation',
      'advanced',
    ]);
    expect(research.tabs[1].label).toBe('automation');
    expect(research.tabs[1].boxes.map((box) => box.id)).toEqual([
      'autoSeedSpawn',
      'autoPlantTiles',
      'autoHarvestTiles',
      'autoBrewCauldrons',
      'autoBottleCauldrons',
      'autoCollectCauldrons',
    ]);
    expect(research.tabs[1].boxes[0].researches[0]).toEqual({
      id: automationResearchIds.autoSeedSpawn(),
      label: 'auto seed spawn',
      value: '10 crystal',
      effect: 'auto',
      description: 'summons researched seeds when enough mana is available.',
      costGold: 0,
      costCrystal: 10,
      costCurrency: 'crystal',
      completed: false,
      canResearch: false,
    });
    expect(research.tabs[1].boxes[1].researches[0]).toEqual({
      id: automationResearchIds.autoPlantTile(1),
      label: 'auto plant tile 1',
      value: '1 crystal',
      effect: 'auto',
      description: 'garden tile 1 plants its selected seed when one is available.',
      costGold: 0,
      costCrystal: 1,
      costCurrency: 'crystal',
      completed: false,
      canResearch: false,
    });
    expect(research.tabs[1].boxes[1].researches[1]).toMatchObject({
      id: automationResearchIds.autoPlantTile(2),
      label: 'auto plant tile 2',
      value: 'locked',
      requiredResearchIds: [automationResearchIds.autoPlantTile(1)],
      costGold: 0,
      costCrystal: 2,
      costCurrency: 'crystal',
      locked: true,
    });
    expect(research.tabs[1].boxes[1].researches.map((research) => research.id)).toEqual([
      automationResearchIds.autoPlantTile(1),
      automationResearchIds.autoPlantTile(2),
    ]);
    expect(research.tabs[1].boxes[2].researches.map((research) => research.id)).toEqual([
      automationResearchIds.autoHarvestPlant(1),
      automationResearchIds.autoHarvestPlant(2),
    ]);
    expect(research.tabs[1].boxes[3].researches.map((research) => research.id)).toEqual([
      automationResearchIds.autoBrewCauldron(1),
    ]);
    expect(research.tabs[1].boxes[4].researches.map((research) => research.id)).toEqual([
      automationResearchIds.autoBottleCauldron(1),
    ]);
    expect(research.tabs[1].boxes[5].researches.map((research) => research.id)).toEqual([
      automationResearchIds.autoCollectCauldron(1),
    ]);
    expect(research.tabs[1].boxes[3].researches[0]).toMatchObject({
      id: automationResearchIds.autoBrewCauldron(1),
      label: 'auto brew cauldron 1',
      value: '1 crystal',
      description:
        'cauldron 1 starts brewing when staged ingredients and mana are ready.',
      costGold: 0,
      costCrystal: 1,
      costCurrency: 'crystal',
    });
    expect(research.tabs[2].boxes.map((box) => box.id)).toEqual([
      'cauldronBrewing',
      'plotGrowth',
    ]);
    expect(research.tabs[2].boxes[0].researches.map((research) => research.id)).toEqual([
      advancedResearchIds.cauldronBrewing(1, 1),
    ]);
    expect(research.tabs[2].boxes[0].researches[0]).toMatchObject({
      id: advancedResearchIds.cauldronBrewing(1, 1),
      label: 'cauldron 1 brewing lvl 1',
      value: '1 ruby',
      effect: '-2% time',
      showEffect: true,
      requiredResearchIds: [],
      costGold: 0,
      costRuby: 1,
      costCurrency: 'ruby',
    });
    expect(research.tabs[2].boxes[1].researches.map((research) => research.id)).toEqual([
      advancedResearchIds.plotGrowth(1, 1),
      advancedResearchIds.plotGrowth(2, 1),
    ]);
    expect(research.boxes.map((box) => box.id)).toEqual([
      'seedUnlocks',
      'summonSeeds',
      'recipeUnlocks',
    ]);
    expect(research.boxes[0].researches).toHaveLength(14);
    expect(research.boxes[0].researches[0]).toEqual({
      id: 'unlockSeed:sageSeed',
      label: 'sage seed',
      value: 'free',
      effect: 'drop',
      description: 'allows sage seed to drop from summon seed.',
      costGold: 0,
      completed: false,
      canResearch: true,
    });
    expect(research.boxes[1].researches).toEqual([
      {
        id: 'summonSeedsX2',
        label: 'x2 summon',
        value: '300 gold',
        effect: '20 mana',
        description: 'summons 2 researched seeds for 20 mana.',
        costGold: 300,
        completed: false,
        canResearch: false,
      },
      {
        id: 'summonSeedsX3',
        label: 'x3 summon',
        value: 'locked',
        effect: '30 mana',
        requiredResearchIds: ['summonSeedsX2'],
        description: 'summons 3 researched seeds for 30 mana.',
        costGold: 900,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'summonSeedsX4',
        label: 'x4 summon',
        value: 'locked',
        effect: '40 mana',
        requiredResearchIds: ['summonSeedsX3'],
        description: 'summons 4 researched seeds for 40 mana.',
        costGold: 2200,
        completed: false,
        locked: true,
        canResearch: false,
      },
      {
        id: 'summonSeedsX5',
        label: 'x5 summon',
        value: 'locked',
        effect: '50 mana',
        requiredResearchIds: ['summonSeedsX4'],
        description: 'summons 5 researched seeds for 50 mana.',
        costGold: 5000,
        completed: false,
        locked: true,
        canResearch: false,
      },
    ]);
    expect(research.boxes[2].researches).toHaveLength(18);
    expect(research.boxes[2].researches[0]).toEqual({
      id: 'unlockRecipe:manaTonic',
      label: 'mana tonic',
      value: '80 gold',
      effect: 'brew',
      description: 'allows valid cauldron ingredients to brew mana tonic.',
      costGold: 80,
      completed: false,
      canResearch: false,
    });
  });

  it('hides tile and cauldron automation research above current level caps', () => {
    const { gameplayFacade } = createGameplay();
    const getAutomationBoxResearchIds = (boxId) =>
      gameplayFacade
        .getSnapshot()
        .research.tabs.find((tab) => tab.id === 'automation')
        ?.boxes.find((box) => box.id === boxId)
        ?.researches.map((research) => research.id) ?? [];

    expect(getAutomationBoxResearchIds('autoPlantTiles')).toEqual([
      automationResearchIds.autoPlantTile(1),
      automationResearchIds.autoPlantTile(2),
    ]);
    expect(getAutomationBoxResearchIds('autoHarvestTiles')).toEqual([
      automationResearchIds.autoHarvestPlant(1),
      automationResearchIds.autoHarvestPlant(2),
    ]);
    expect(getAutomationBoxResearchIds('autoBrewCauldrons')).toEqual([
      automationResearchIds.autoBrewCauldron(1),
    ]);
    expect(getAutomationBoxResearchIds('autoBottleCauldrons')).toEqual([
      automationResearchIds.autoBottleCauldron(1),
    ]);
    expect(getAutomationBoxResearchIds('autoCollectCauldrons')).toEqual([
      automationResearchIds.autoCollectCauldron(1),
    ]);

    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(5);
    expect(getAutomationBoxResearchIds('autoPlantTiles')).toEqual([
      automationResearchIds.autoPlantTile(1),
      automationResearchIds.autoPlantTile(2),
      automationResearchIds.autoPlantTile(3),
      automationResearchIds.autoPlantTile(4),
      automationResearchIds.autoPlantTile(5),
    ]);
    expect(getAutomationBoxResearchIds('autoHarvestTiles')).toEqual([
      automationResearchIds.autoHarvestPlant(1),
      automationResearchIds.autoHarvestPlant(2),
      automationResearchIds.autoHarvestPlant(3),
      automationResearchIds.autoHarvestPlant(4),
      automationResearchIds.autoHarvestPlant(5),
    ]);
    expect(getAutomationBoxResearchIds('autoBrewCauldrons')).toEqual([
      automationResearchIds.autoBrewCauldron(1),
      automationResearchIds.autoBrewCauldron(2),
      automationResearchIds.autoBrewCauldron(3),
    ]);
    expect(getAutomationBoxResearchIds('autoBottleCauldrons')).toEqual([
      automationResearchIds.autoBottleCauldron(1),
      automationResearchIds.autoBottleCauldron(2),
      automationResearchIds.autoBottleCauldron(3),
    ]);
    expect(getAutomationBoxResearchIds('autoCollectCauldrons')).toEqual([
      automationResearchIds.autoCollectCauldron(1),
      automationResearchIds.autoCollectCauldron(2),
      automationResearchIds.autoCollectCauldron(3),
    ]);
  });

  it('buys research with gold from research balance', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
      cost: 0,
    });

    gameplayFacade.goldFacade.add(25);

    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[1]).toMatchObject({
      id: 'unlockSeed:mintSeed',
      value: '25 gold',
      costGold: 25,
      completed: false,
      canResearch: true,
    });

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      cost: 25,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().gold.totalGenerated).toBe(25);
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
      'unlockSeed:mintSeed',
    ]);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: false,
      reason: 'already_researched',
      researchId: 'unlockSeed:mintSeed',
      cost: 25,
    });
  });

  it('takes time to complete research', () => {
    const { ecsFacade, gameplayFacade } = createGameplay({ instantResearch: false });
    const researchAnnouncements = [];

    gameplayFacade.setWorldChatFacade({
      announceResearch: (researchName) => {
        researchAnnouncements.push(researchName);
        return Promise.resolve({ ok: true, researchName });
      },
    });

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
      durationSeconds: 3,
      remainingSeconds: 3,
      cost: 0,
    });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([]);
    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[0]).toMatchObject({
      id: 'unlockSeed:sageSeed',
      value: 'researching',
      inProgress: true,
      remainingMs: 3_000,
      totalMs: 3_000,
      canResearch: false,
    });
    expect(gameplayFacade.getSnapshot().logs.entries).toEqual([]);
    expect(researchAnnouncements).toEqual([]);

    ecsFacade.update({ timerDeltaSeconds: 2 });

    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[0]).toMatchObject({
      value: 'researching',
      inProgress: true,
      remainingMs: 1_000,
    });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([]);

    ecsFacade.update({ timerDeltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
    ]);
    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toEqual([
      'researched sage seed',
    ]);
    expect(researchAnnouncements).toEqual(['sage seed']);
  });

  it('buys advanced research with crystal and auto summons seeds', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.goldFacade.add(100);

    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toEqual({
      ok: false,
      reason: 'not_enough_crystal',
      researchId: automationResearchIds.autoSeedSpawn(),
      cost: 10,
      costCurrency: 'crystal',
    });

    gameplayFacade.crystalFacade.add(10);

    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toEqual({
      ok: true,
      researchId: automationResearchIds.autoSeedSpawn(),
      cost: 10,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(0);
    expect(gameplayFacade.getSnapshot().gold.current).toBe(100);

    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(0);
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });
  });

  it('buys advanced speed research with ruby and reveals the next level', () => {
    const { gameplayFacade } = createGameplay();
    const researchId = advancedResearchIds.cauldronBrewing(1, 1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: false,
      reason: 'not_enough_ruby',
      researchId,
      cost: 1,
      costCurrency: 'ruby',
    });

    gameplayFacade.rubyFacade.add(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 1,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(0);
    expect(
      gameplayFacade
        .getSnapshot()
        .research.tabs.find((tab) => tab.id === 'advanced')
        ?.boxes.find((box) => box.id === 'cauldronBrewing')
        ?.researches.map((research) => research.id),
    ).toEqual([advancedResearchIds.cauldronBrewing(1, 2)]);
  });

  it('advanced speed research lowers plot growth and cauldron brewing timers', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.rubyFacade.add(2);
    expect(gameplayFacade.buyResearch(advancedResearchIds.plotGrowth(1, 1))).toMatchObject({
      ok: true,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.buyResearch(advancedResearchIds.cauldronBrewing(1, 1))).toMatchObject({
      ok: true,
      costCurrency: 'ruby',
    });

    gameplayFacade.itemsFacade.addItem(1, 1);
    expect(gameplayFacade.plantGardenSeed(1, 1)).toMatchObject({
      ok: true,
      durationMs: 19_600,
    });

    ecsFacade.update({ deltaSeconds: 12 });
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.itemsFacade.addItem(1001, 3);
    expect(gameplayFacade.buyResearch('unlockRecipe:manaTonic')).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      durationMs: 29_400,
    });
  });

  it('reserves mana for pending auto brew before auto summoning seeds', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.crystalFacade.add(11);
    gameplayFacade.itemsFacade.addItem(1001, 3);

    expect(gameplayFacade.buyResearch('unlockRecipe:manaTonic')).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBrewCauldron(1))).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe('manaTonic')).toMatchObject({
      ok: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(gameplayFacade.setBrewingAutoBrewEnabled(true)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
    });

    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(10);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 0,
    });

    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(0);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'brewing',
      remainingMs: 30_000,
    });
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 0,
    });
  });

  it('announces successful research purchases to world chat', () => {
    const { gameplayFacade } = createGameplay();
    const researchAnnouncements = [];

    gameplayFacade.setWorldChatFacade({
      announceResearch: (researchName) => {
        researchAnnouncements.push(researchName);
        return Promise.resolve({ ok: true, researchName });
      },
    });

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
      cost: 0,
    });
    expect(researchAnnouncements).toEqual(['sage seed']);

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toEqual({
      ok: false,
      reason: 'already_researched',
      researchId: 'unlockSeed:sageSeed',
      cost: 0,
    });
    expect(researchAnnouncements).toEqual(['sage seed']);
  });

  it('announces task level-ups to world chat', () => {
    const { gameplayFacade } = createGameplay();
    const levelUpAnnouncements = [];

    gameplayFacade.setWorldChatFacade({
      announceLevelUp: (playerLevel) => {
        levelUpAnnouncements.push(playerLevel);
        return Promise.resolve({ ok: true, playerLevel });
      },
    });

    finishCurrentTaskLevel(gameplayFacade);

    expect(levelUpAnnouncements).toEqual([2]);
  });

  it('rejects removed mana research ids', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(150);

    expect(gameplayFacade.buyResearch('manaSphereCap:1')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'manaSphereCap:1',
    });
    expect(gameplayFacade.buyResearch('manaProductionRate:1')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'manaProductionRate:1',
    });
    expect(gameplayFacade.getSnapshot().mana).toMatchObject({
      cap: 50,
      perSecond: 1,
    });
  });

  it('rejects removed mana research levels out of order as unknown', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(20);

    expect(gameplayFacade.buyResearch('manaProductionRate:2')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'manaProductionRate:2',
    });
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBe(1);
  });

  it('requires seed, summon multiplier, and recipe researches in order', () => {
    const { gameplayFacade } = createGameplay();
    const getResearch = (researchId) =>
      gameplayFacade
        .getSnapshot()
        .research.boxes.flatMap((box) => box.researches)
        .find((research) => research.id === researchId);

    gameplayFacade.goldFacade.add(405);

    expect(getResearch('unlockSeed:mintSeed')).toMatchObject({
      value: 'locked',
      requiredResearchIds: ['unlockSeed:sageSeed'],
      locked: true,
      canResearch: false,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'unlockSeed:mintSeed',
      requiredResearchId: 'unlockSeed:sageSeed',
      cost: 25,
    });

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:sageSeed',
      cost: 0,
    });
    expect(getResearch('unlockSeed:mintSeed')).toMatchObject({
      value: '25 gold',
      canResearch: true,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      cost: 25,
    });

    expect(getResearch('summonSeedsX3')).toMatchObject({
      value: 'locked',
      requiredResearchIds: ['summonSeedsX2'],
      locked: true,
      canResearch: false,
    });
    expect(gameplayFacade.buyResearch('summonSeedsX3')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'summonSeedsX3',
      requiredResearchId: 'summonSeedsX2',
      cost: 900,
    });

    expect(gameplayFacade.buyResearch('summonSeedsX2')).toEqual({
      ok: true,
      researchId: 'summonSeedsX2',
      cost: 300,
    });
    expect(getResearch('summonSeedsX3')).toMatchObject({
      value: '900 gold',
      canResearch: false,
    });
    expect(gameplayFacade.buyResearch('summonSeedsX4')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'summonSeedsX4',
      requiredResearchId: 'summonSeedsX3',
      cost: 2200,
    });

    expect(getResearch('unlockRecipe:minorHealingPotion')).toMatchObject({
      value: 'locked',
      requiredResearchIds: ['unlockRecipe:manaTonic'],
      locked: true,
      canResearch: false,
    });
    expect(gameplayFacade.buyResearch('unlockRecipe:minorHealingPotion')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'unlockRecipe:minorHealingPotion',
      requiredResearchId: 'unlockRecipe:manaTonic',
      cost: 120,
    });

    expect(gameplayFacade.buyResearch('unlockRecipe:manaTonic')).toEqual({
      ok: true,
      researchId: 'unlockRecipe:manaTonic',
      cost: 80,
    });
    gameplayFacade.goldFacade.add(120);
    expect(getResearch('unlockRecipe:minorHealingPotion')).toMatchObject({
      value: '120 gold',
      canResearch: true,
    });
  });

  it('rejects legacy mana research ids', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(75);

    expect(gameplayFacade.buyResearch('manaProductionRate')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'manaProductionRate',
    });
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBe(1);
  });

  it('rejects research purchase without enough gold', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'unlockSeed:mintSeed',
      requiredResearchId: 'unlockSeed:sageSeed',
      cost: 25,
    });

    expect(gameplayFacade.buyResearch('unlockSeed:sageSeed')).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: false,
      reason: 'not_enough_gold',
      researchId: 'unlockSeed:mintSeed',
      cost: 25,
    });
  });

  it('brews an unlocked matching recipe after herbs are added in order', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    ecsFacade.update({ deltaSeconds: 12 });

    expect(gameplayFacade.getSnapshot().brewing.recipes[0]).toMatchObject({
      key: 'manaTonic',
      label: 'mana tonic',
      unlocked: true,
      ingredients: [
        {
          key: 'sageHerb',
          label: 'sage',
          quantity: 3,
        },
      ],
    });
    expect(gameplayFacade.getSnapshot().brewing.recipes[1]).toMatchObject({
      key: 'minorHealingPotion',
      unlocked: false,
    });

    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      buttonLabel: 'brew mana tonic',
      manaCost: 12,
      canBrew: true,
      match: {
        key: 'manaTonic',
        label: 'mana tonic',
        unlocked: true,
      },
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      wasted: false,
      potion: {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        kind: 'potion',
      },
      manaCost: 12,
      durationMs: 30_000,
    });
    expect(gameplayFacade.getSnapshot().mana.current).toBe(0);
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toEqual([]);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      resultItemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
    });

    ecsFacade.update({ deltaSeconds: 30 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'brewed',
      canStartBottling: true,
      remainingMs: 0,
      totalMs: 30_000,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);

    expect(gameplayFacade.startBrewingBottling()).toMatchObject({
      ok: true,
      durationMs: 2_000,
    });
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'bottling',
      remainingMs: 2_000,
      totalMs: 2_000,
    });

    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'ready',
      canCollect: true,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.collectBrewingPotion()).toMatchObject({
      ok: true,
      potion: {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'mana tonic',
        kind: 'potion',
      },
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
  });

  it('prepares a selected brewing recipe from owned herbs', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic')).toMatchObject({
      ok: true,
      recipe: {
        key: 'manaTonic',
      },
      ingredientItemTypeIds: [1001, 1001, 1001],
    });
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().brewing.herbs[0]).toMatchObject({
      quantity: 3,
      stagedQuantity: 3,
      availableQuantity: 0,
    });
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 3,
    });
  });

  it('uses level-unlocked cauldrons as independent brewing slots', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 5);
    gameplayFacade.syncPlayerLevelManaEffects();
    gameplayFacade.manaFacade.fill();
    gameplayFacade.itemsFacade.addItem(1001, 6);
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    expect(gameplayFacade.getSnapshot().brewing.maxCauldrons).toBe(3);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons).toHaveLength(3);

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic', 1)).toMatchObject({
      ok: true,
      cauldronNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toEqual([]);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().brewing.herbs[0]).toMatchObject({
      stagedQuantity: 3,
      availableQuantity: 3,
    });

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic', 0)).toMatchObject({
      ok: true,
      cauldronNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0].ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().brewing.herbs[0]).toMatchObject({
      stagedQuantity: 6,
      availableQuantity: 0,
    });

    expect(gameplayFacade.brewCauldron(1)).toMatchObject({
      ok: true,
      cauldronNumber: 2,
      potion: {
        key: 'manaTonic',
      },
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0].ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].ingredients).toEqual([]);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].activeBrew).toMatchObject({
      cauldronNumber: 2,
      phase: 'brewing',
    });

    ecsFacade.update({ deltaSeconds: 30 });

    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0].activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].activeBrew).toMatchObject({
      phase: 'brewed',
      canStartBottling: true,
    });
  });

  it('clears the cauldron and reports missing herbs for selected recipes', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 1);
    gameplayFacade.addBrewingIngredient(1001);

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic')).toMatchObject({
      ok: false,
      reason: 'not_enough_ingredients',
      recipe: {
        key: 'manaTonic',
      },
      missingIngredients: [
        {
          itemTypeId: 1001,
          label: 'sage',
          requiredQuantity: 3,
          ownedQuantity: 1,
          missingQuantity: 2,
        },
      ],
    });
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toEqual([]);
  });

  it('auto brews, bottles, and collects cauldron potions after research', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(80);
    gameplayFacade.crystalFacade.add(3);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBrewCauldron(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBottleCauldron(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoCollectCauldron(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe('manaTonic')).toMatchObject({
      ok: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(gameplayFacade.setBrewingAutoBrewEnabled(true)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
    });
    gameplayFacade.itemsFacade.addItem(1001, 3);
    ecsFacade.update({ deltaSeconds: 12 });
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    ecsFacade.update({ deltaSeconds: 0 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(0);
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toEqual([]);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'brewing',
      remainingMs: 30_000,
    });

    ecsFacade.update({ deltaSeconds: 30 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'bottling',
      remainingMs: 2_000,
    });

    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toContain(
      'brewed mana tonic',
    );
  });

  it('keeps matching recipe ingredients when recipe research is locked', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    ecsFacade.update({ deltaSeconds: 12 });
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      buttonLabel: 'brew',
      manaCost: 12,
      canBrew: true,
      match: {
        key: 'manaTonic',
        label: 'mana tonic',
        unlocked: false,
      },
    });
    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: false,
      reason: 'research_not_unlocked',
      recipe: {
        key: 'manaTonic',
      },
    });
    expect(gameplayFacade.getSnapshot().mana.current).toBe(12);
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 3,
    });
  });

  it('uses ingredient order and turns unknown mixes into wasted potion worth one gold', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 2);
    gameplayFacade.itemsFacade.addItem(1002, 1);
    ecsFacade.update({ deltaSeconds: 5 });
    gameplayFacade.addBrewingIngredient(1002);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    expect(gameplayFacade.getSnapshot().brewing.match).toBeNull();
    expect(gameplayFacade.getSnapshot().brewing.buttonLabel).toBe('brew');
    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      wasted: true,
      potion: {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'wasted potion',
        kind: 'potion',
      },
      manaCost: 5,
      durationMs: 4_000,
    });

    ecsFacade.update({ deltaSeconds: 6 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'brewed',
      canStartBottling: true,
    });
    expect(gameplayFacade.startBrewingBottling()).toMatchObject({
      ok: true,
      durationMs: 2_000,
    });

    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      phase: 'ready',
      canCollect: true,
    });
    expect(gameplayFacade.collectBrewingPotion()).toMatchObject({
      ok: true,
      potion: {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'wasted potion',
        kind: 'potion',
      },
      quantity: 1,
    });

    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'wasted potion',
        kind: 'potion',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems).toContainEqual({
      itemTypeId: 2029,
      key: 'wastedPotion',
      label: 'wasted potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
      quantity: 1,
      sellGold: 1,
      sellNeed: 1000,
      buyGold: null,
      stock: null,
    });
  });

  it('buys NPC market stands with costs from shop balance', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      maxSlots: 5,
      maxUnlockedSlotsByLevel: 1,
      slotCosts: [0, 50, 150, 400, 1000],
      nextSlotNumber: 2,
      nextSlotCost: 50,
      nextSlotLockedByLevel: true,
      nextSlotRequiresLevel: 3,
      selectedSlotNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    expect(gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id)).toEqual({
      ok: true,
      slotNumber: 1,
      item: {
        itemTypeId: summonResult.seed.id,
        key: summonResult.seed.key,
        label: summonResult.seed.label,
        kind: 'seed',
      },
    });

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: false,
      reason: 'level_locked',
      requiredLevel: 3,
      slotNumber: 2,
    });

    for (let levelCount = 1; levelCount < 3; levelCount += 1) {
      finishCurrentTaskLevel(gameplayFacade);
    }

    gameplayFacade.goldFacade.add(49);

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: true,
      cost: 50,
      slotNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().shop.shelf.unlockedSlots).toBe(2);
    expect(gameplayFacade.getSnapshot().shop.shelf.nextSlotCost).toBe(150);
    expect(gameplayFacade.getSnapshot().shop.shelf.nextSlotLockedByLevel).toBe(true);
    expect(gameplayFacade.getSnapshot().shop.shelf.nextSlotRequiresLevel).toBe(10);
  });

  it('buys garden tiles with costs from garden balance', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().garden.plot).toMatchObject({
      unlockedTiles: 1,
      maxTiles: 10,
      maxUnlockedTilesByLevel: 2,
      tilesPerRow: 4,
      tileCosts: [0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800],
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileRequiresLevel: null,
      harvestSeconds: 10,
    });
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 0,
    });

    expect(gameplayFacade.buyGardenTile()).toEqual({
      ok: false,
      reason: 'not_enough_gold',
      cost: 25,
      tileNumber: 2,
    });

    gameplayFacade.goldFacade.add(25);

    expect(gameplayFacade.buyGardenTile()).toEqual({
      ok: true,
      cost: 25,
      tileNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.unlockedTiles).toBe(2);
    expect(gameplayFacade.getSnapshot().garden.plot.nextTileCost).toBe(75);
    expect(gameplayFacade.getSnapshot().garden.plot.nextTileLockedByLevel).toBe(true);
    expect(gameplayFacade.getSnapshot().garden.plot.nextTileRequiresLevel).toBe(2);

    finishCurrentTaskLevel(gameplayFacade);
    gameplayFacade.goldFacade.add(75);

    expect(gameplayFacade.buyGardenTile()).toEqual({
      ok: true,
      cost: 75,
      tileNumber: 3,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.unlockedTiles).toBe(3);
  });

  it('grows planted garden seeds and harvests herbs over time', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);

    expect(gameplayFacade.plantGardenSeed(1, 1)).toEqual({
      ok: true,
      tileNumber: 1,
      seed: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      herb: {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
      },
      durationMs: 20_000,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      tileNumber: 1,
      unlocked: true,
      phase: 'growing',
      selectedSeedKey: 'sageSeed',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 20_000,
      totalMs: 20_000,
      process: {
        phase: 'growing',
        totalMs: 20_000,
        remainingMs: 20_000,
        progress: 0,
      },
    });

    ecsFacade.update({ deltaSeconds: 19 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      remainingMs: 1_000,
    });

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'ready',
      process: null,
      herbLabel: 'sage',
    });

    expect(gameplayFacade.startGardenHarvest(1)).toEqual({
      ok: true,
      tileNumber: 1,
      herb: {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
      },
      durationMs: 10_000,
    });

    ecsFacade.update({ deltaSeconds: 9 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'harvesting',
      remainingMs: 1_000,
      process: {
        phase: 'harvesting',
        remainingMs: 1_000,
      },
    });

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'empty',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: null,
      herbItemTypeId: null,
      process: null,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 1,
    });
  });

  it('keeps the selected garden seed after harvest but waits for manual planting', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 2);
    gameplayFacade.plantGardenSeed(1, 1);
    ecsFacade.update({ deltaSeconds: 60 });
    gameplayFacade.startGardenHarvest(1);
    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'empty',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      selectedSeedLabel: 'sage seed',
      seedItemTypeId: null,
      herbItemTypeId: null,
      process: null,
    });
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });

    expect(gameplayFacade.plantSelectedGardenSeed(1)).toMatchObject({
      ok: true,
      tileNumber: 1,
      seed: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      selectedSeedKey: 'sageSeed',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
    });
  });

  it('cancels in-progress garden planting, returns the seed, and empties the plot', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.plantGardenSeed(1, 1);

    expect(gameplayFacade.cancelGardenPlanting(1)).toMatchObject({
      ok: true,
      tileNumber: 1,
      seed: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'empty',
      selectedSeedItemTypeId: null,
      selectedSeedKey: null,
      selectedSeedLabel: null,
      seedItemTypeId: null,
      seedKey: null,
      seedLabel: null,
      herbItemTypeId: null,
      herbKey: null,
      herbLabel: null,
      process: null,
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });
    expect(gameplayFacade.cancelGardenPlanting(1)).toMatchObject({
      ok: false,
      reason: 'tile_empty',
      tileNumber: 1,
    });
  });

  it('auto harvests ready plants and auto replants selected tiles after research', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);
    gameplayFacade.goldFacade.add(25);
    gameplayFacade.crystalFacade.add(2);
    expect(gameplayFacade.buyGardenTile()).toMatchObject({
      ok: true,
      tileNumber: 2,
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoPlantTile(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoHarvestPlant(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'crystal',
    });
    gameplayFacade.itemsFacade.addItem(1, 4);
    gameplayFacade.plantGardenSeed(1, 1);
    gameplayFacade.plantGardenSeed(2, 1);

    ecsFacade.update({ deltaSeconds: 20 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'harvesting',
      selectedSeedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 10_000,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[1]).toMatchObject({
      phase: 'ready',
      selectedSeedKey: 'sageSeed',
      herbKey: 'sageHerb',
    });

    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      selectedSeedKey: 'sageSeed',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 20_000,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[1]).toMatchObject({
      phase: 'ready',
      selectedSeedKey: 'sageSeed',
      herbKey: 'sageHerb',
    });
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toEqual([
      'opened garden plot 2',
      'researched auto plant tile 1',
      'researched auto harvest tile 1',
      'planted sage seed',
      'planted sage seed',
      'harvested sage',
      'planted sage seed',
    ]);
  });

  it('rejects garden seed changes while a crop is active', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 2);
    gameplayFacade.plantGardenSeed(1, 1);

    expect(gameplayFacade.selectGardenSeed(1, null)).toEqual({
      ok: false,
      reason: 'tile_busy',
      tileNumber: 1,
    });
    expect(gameplayFacade.selectGardenSeed(1, 2)).toEqual({
      ok: false,
      reason: 'tile_busy',
      tileNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
    });

    ecsFacade.update({ deltaSeconds: 60 });
    gameplayFacade.startGardenHarvest(1);
    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'empty',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      seedKey: null,
      herbKey: null,
    });
  });

  it('restores active garden crop selection to the planted seed', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.itemsFacade.addItem(1, 2);
    first.gameplayFacade.plantGardenSeed(1, 1);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const save = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    save.garden.tiles[0].selectedSeedItemKey = null;
    persistenceStorage.setItem('idle-wizard.gameplay.save', JSON.stringify(save));

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
    });

    second.ecsFacade.update({ deltaSeconds: 60 });
    second.gameplayFacade.startGardenHarvest(1);
    second.ecsFacade.update({ deltaSeconds: 10 });

    expect(second.gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'empty',
      selectedSeedItemTypeId: 1,
      selectedSeedKey: 'sageSeed',
      seedKey: null,
      herbKey: null,
    });
  });

  it('plants non-sage garden seeds into their matching herbs', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(2, 1);

    expect(gameplayFacade.plantGardenSeed(1, 2)).toMatchObject({
      ok: true,
      seed: {
        key: 'mintSeed',
        label: 'mint seed',
      },
      herb: {
        key: 'mintHerb',
        label: 'mint',
      },
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      seedKey: 'mintSeed',
      seedLabel: 'mint seed',
      herbKey: 'mintHerb',
      herbLabel: 'mint',
    });
  });

  it('persists active garden growth timers across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.itemsFacade.addItem(1, 1);
    first.gameplayFacade.plantGardenSeed(1, 1);
    first.ecsFacade.update({ deltaSeconds: 5 });
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      tileNumber: 1,
      phase: 'growing',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 15_000,
      totalMs: 20_000,
    });

    second.ecsFacade.update({ deltaSeconds: 15 });

    expect(second.gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'ready',
      process: null,
    });
  });

  it('rejects NPC market stand purchase without enough gold', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: false,
      reason: 'level_locked',
      requiredLevel: 3,
      slotNumber: 2,
    });

    for (let levelCount = 1; levelCount < 3; levelCount += 1) {
      finishCurrentTaskLevel(gameplayFacade);
    }

    expect(gameplayFacade.buyShopShelfSlot()).toEqual({
      ok: false,
      reason: 'not_enough_gold',
      cost: 50,
      slotNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().shop.shelf.unlockedSlots).toBe(1);
  });

  it('discovers an unknown potion recipe by brewing the hidden ingredient order', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const discoveries = new Map();
    const potionDiscoveryFacade = {
      discoverPotionRecipe: (potionKey) => {
        discoveries.set(potionKey, {
          potionKey,
          potionLabel: 'ashen memory',
          username: 'Ada',
          discoveredAtMs: Date.UTC(2026, 0, 2),
        });

        return Promise.resolve({ ok: true, potionKey });
      },
      getDiscovery: (potionKey) => discoveries.get(potionKey) ?? null,
      hasDiscoveredPotion: (potionKey) => discoveries.has(potionKey),
    };

    gameplayFacade.setPotionDiscoveryFacade(potionDiscoveryFacade);
    gameplayFacade.itemsFacade.addItem(1001, 1);
    gameplayFacade.itemsFacade.addItem(1004, 1);
    gameplayFacade.itemsFacade.addItem(1010, 1);
    ecsFacade.update({ deltaSeconds: 36 });

    expect(
      gameplayFacade
        .getSnapshot()
        .discoveries.potions.find((potion) => potion.key === 'ashenMemory'),
    ).toMatchObject({
      discovered: false,
      known: false,
      quantity: 0,
    });

    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1004);
    gameplayFacade.addBrewingIngredient(1010);

    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      buttonLabel: 'brew',
      manaCost: 5,
      canBrew: true,
      match: null,
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      wasted: false,
      potion: {
        itemTypeId: 2019,
        key: 'ashenMemory',
        label: 'ashen memory',
        kind: 'potion',
      },
      discovery: {
        potionKey: 'ashenMemory',
        potionLabel: 'ashen memory',
      },
      manaCost: 5,
      durationMs: 80_000,
    });
    expect(gameplayFacade.getSnapshot().mana.current).toBe(31);

    expect(discoveries.has('ashenMemory')).toBe(true);
    expect(
      gameplayFacade
        .getSnapshot()
        .discoveries.potions.find((potion) => potion.key === 'ashenMemory'),
    ).toMatchObject({
      discovered: true,
      known: true,
      discoveredByUsername: 'Ada',
      discoveredAtMs: Date.UTC(2026, 0, 2),
      ingredients: [
        { key: 'sageHerb', quantity: 1 },
        { key: 'lavenderHerb', quantity: 1 },
        { key: 'frostmossHerb', quantity: 1 },
      ],
    });

    const { ecsFacade: secondEcsFacade, gameplayFacade: secondGameplayFacade } = createGameplay();
    secondGameplayFacade.setPotionDiscoveryFacade(potionDiscoveryFacade);
    secondGameplayFacade.itemsFacade.addItem(1001, 1);
    secondGameplayFacade.itemsFacade.addItem(1004, 1);
    secondGameplayFacade.itemsFacade.addItem(1010, 1);
    secondEcsFacade.update({ deltaSeconds: 36 });
    secondGameplayFacade.addBrewingIngredient(1001);
    secondGameplayFacade.addBrewingIngredient(1004);
    secondGameplayFacade.addBrewingIngredient(1010);

    expect(secondGameplayFacade.getSnapshot().brewing).toMatchObject({
      buttonLabel: 'brew ashen memory',
      manaCost: 36,
      canBrew: true,
      match: {
        key: 'ashenMemory',
        label: 'ashen memory',
        realLabel: 'ashen memory',
        unlocked: true,
        discoverable: false,
      },
    });
  });

  it('shows shop sell items for all catalog rows', () => {
    const { gameplayFacade } = createGameplay();

    const initialSellItems = gameplayFacade.getSnapshot().shop.shelf.sellItems;

    expect(initialSellItems).toHaveLength(57);
    expect(initialSellItems.find((item) => item.key === 'sageSeed')).toMatchObject({
      quantity: 0,
      sellGold: 1,
    });
    expect(initialSellItems.find((item) => item.key === 'manaTonic')).toMatchObject({
      quantity: 0,
      sellGold: 55,
    });

    gameplayFacade.buyResearch('unlockSeed:sageSeed');
    gameplayFacade.itemsFacade.addItem(2, 2);
    gameplayFacade.goldFacade.add(80);
    gameplayFacade.buyResearch('unlockRecipe:manaTonic');

    const sellItems = gameplayFacade.getSnapshot().shop.shelf.sellItems;

    expect(sellItems).toHaveLength(57);
    expect(sellItems.find((item) => item.key === 'mintSeed')).toMatchObject({
      quantity: 2,
      sellGold: 1,
    });
    expect(sellItems.find((item) => item.key === 'sageHerb')).toMatchObject({
      quantity: 0,
      sellGold: 6,
    });
    expect(sellItems.find((item) => item.key === 'nettleSeed')).toMatchObject({
      quantity: 0,
      sellGold: 1,
    });
  });

  it('auto sells selected NPC market item over time', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id);

    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().inventory).toHaveLength(1);

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      slotNumber: 1,
      unlocked: true,
      sellItemTypeId: summonResult.seed.id,
      sellKind: 'seed',
      sellLabel: summonResult.seed.label,
      sellQuantity: 0,
    });
  });

  it('collects the crystal-tab gold offer and cools it down', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      rewardGold: 20,
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });

    expect(gameplayFacade.collectShopGoldOffer()).toEqual({
      ok: true,
      gold: 20,
      cooldownSeconds: 7_200,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(20);
    expect(gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      cooldownRemainingSeconds: 7_200,
      canCollect: false,
    });
    expect(gameplayFacade.collectShopGoldOffer()).toMatchObject({
      ok: false,
      reason: 'cooldown',
    });

    ecsFacade.update({ timerDeltaSeconds: 7_199 });
    expect(gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      cooldownRemainingSeconds: 1,
      canCollect: false,
    });

    finishCurrentTaskLevel(gameplayFacade);
    ecsFacade.update({ timerDeltaSeconds: 1 });
    expect(gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      rewardGold: 40,
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });
    expect(gameplayFacade.collectShopGoldOffer()).toMatchObject({
      ok: true,
      gold: 40,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(60);
  });

  it('persists crystal-tab gold offer cooldown and catches it up offline', () => {
    const persistenceStorage = createMemoryStorage();
    let now = 1_000_000;
    const first = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });

    first.gameplayFacade.collectShopGoldOffer();
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    now += 3_600_000;
    const second = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });
    expect(second.gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      cooldownRemainingSeconds: 3_600,
      canCollect: false,
    });
    second.gameplayFacade.shutdown();
    second.ecsFacade.destroyWorld();

    now += 3_600_000;
    const third = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });
    expect(third.gameplayFacade.getSnapshot().shop.goldOffer).toMatchObject({
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });
    third.gameplayFacade.shutdown();
    third.ecsFacade.destroyWorld();
  });

  it('excludes cauldron-staged herbs from NPC market sales', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1001);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems.find((item) => item.key === 'sageHerb'))
      .toMatchObject({
        quantity: 1,
        sellGold: 6,
      });
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      sellItemTypeId: 1001,
      sellQuantity: 1,
    });

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(6);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 2,
      },
    ]);
    expect(gameplayFacade.getSnapshot().brewing.herbs.find((herb) => herb.key === 'sageHerb'))
      .toMatchObject({
        quantity: 2,
        stagedQuantity: 2,
        availableQuantity: 0,
      });

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(6);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 2,
      },
    ]);
    expect(gameplayFacade.getSnapshot().brewing.hasEnoughIngredients).toBe(true);
  });

  it('clears selected NPC market item', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1);

    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.clearSelectedShopShelfSlotSellItem()).toEqual({
      ok: true,
      slotNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      slotNumber: 1,
      unlocked: true,
      sellItemTypeId: null,
      sellKind: null,
      sellLabel: null,
      sellProgressSeconds: 0,
    });

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
  });

  it('lists player market items by reserving quantity and value', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 3);

    expect(
      gameplayFacade.setSelectedPlayerShopShelfSlotListing({
        itemTypeId: 1,
        quantity: 2,
        priceGold: 4,
      }),
    ).toEqual({
      ok: true,
      slotNumber: 1,
      item: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      quantity: 2,
      priceGold: 4,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.playerShelf.slots[0]).toMatchObject({
      slotNumber: 1,
      itemTypeId: 1,
      itemKey: 'sageSeed',
      itemLabel: 'sage seed',
      itemKind: 'seed',
      quantity: 2,
      priceGold: 4,
    });

    expect(gameplayFacade.clearSelectedPlayerShopShelfSlotListing()).toEqual({
      ok: true,
      slotNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 3,
      },
    ]);
  });

  it('excludes cauldron-staged herbs from player market listings', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    expect(
      gameplayFacade.setSelectedPlayerShopShelfSlotListing({
        itemTypeId: 1001,
        quantity: 2,
        priceGold: 4,
      }),
    ).toEqual({
      ok: false,
      reason: 'not_enough_item',
      itemTypeId: 1001,
      availableQuantity: 1,
      quantity: 2,
    });

    expect(
      gameplayFacade.setSelectedPlayerShopShelfSlotListing({
        itemTypeId: 1001,
        quantity: 1,
        priceGold: 4,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceGold: 4,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
        quantity: 2,
      },
    ]);
    expect(gameplayFacade.getSnapshot().brewing.hasEnoughIngredients).toBe(true);
  });

  it('buys player shop listings and claims sale proceeds through gameplay helpers', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(10);

    expect(
      gameplayFacade.buyPlayerShopListingItem({
        itemKey: 'sageSeed',
        quantity: 2,
        priceGold: 3,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 2,
      priceGold: 3,
      totalPriceGold: 6,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(4);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 2,
      },
    ]);

    expect(gameplayFacade.claimPlayerShopSaleProceeds(5)).toEqual({
      ok: true,
      gold: 5,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(9);
  });

  it('auto sells only the selected item type', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.itemsFacade.addItem(2, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(2);

    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().gold.current).toBe(1);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
  });
});

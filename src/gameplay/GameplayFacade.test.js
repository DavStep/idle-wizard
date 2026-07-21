import { describe, expect, it, vi } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { automationResearchIds } from './automation/automationResearchIds.js';
import { GameplayFacade, getPrestigeResetLevel } from './GameplayFacade.js';
import { DEFAULT_PLAYER_LEVEL_BALANCE } from './playerLevel/managers/PlayerLevelBalanceManager.js';
import { advancedResearchIds } from './research/advancedResearchIds.js';
import { capacityResearchIds } from './research/capacityResearchIds.js';
import { automationReserveResearchIds } from './research/automationReserveResearch.js';
import { emeraldResearchIds } from './research/emeraldResearchIds.js';
import { fastSellResearchIds } from './research/fastSellResearch.js';
import { researchCostResearchIds } from './research/researchCostResearch.js';
import { researchTimeResearchIds } from './research/researchTimeResearch.js';
import { taskRequirementTypes } from './tasks/taskRequirementTypes.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function getSavedPersonalTask(storage, taskKey) {
  return getSavedPersonalTasks(storage)?.periods?.daily?.tasks?.find(
    (task) => task.taskKey === taskKey,
  );
}

function getSavedPersonalTasks(storage) {
  const rawSave = storage.getItem('idle-wizard.gameplay.save');
  const save = rawSave ? JSON.parse(rawSave) : null;
  return save?.personalTasks;
}

function stripSaveRevision(save) {
  const runtimeSave = { ...save };
  delete runtimeSave.savedAt;
  delete runtimeSave.clientSaveSessionId;
  delete runtimeSave.clientSaveSequence;
  return runtimeSave;
}

function createGameplay({
  baseline = 'level1',
  instantResearch = true,
  persistenceStorage,
  persistenceNow = () => 0,
  shopNow = () => 0,
} = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceStorage, persistenceNow, shopNow });
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  if (baseline === 'level1' && gameplayFacade.getSnapshot().persistence.loadRevision === 0) {
    applyLevelOneTestBaseline(gameplayFacade);
  }
  if (instantResearch) {
    makeResearchInstant(gameplayFacade);
  }
  gameplayFacade.setNpcMarketFacade(createNpcMarketFacadeFake(gameplayFacade));
  return { ecsFacade, gameplayFacade };
}

function applyLevelOneTestBaseline(gameplayFacade) {
  gameplayFacade.tasksFacade.applyPersistenceSnapshot({
    currentLevel: 1,
    tasks: [],
  });
  gameplayFacade.syncPlayerLevelManaEffects();
  gameplayFacade.manaFacade.applyPersistenceSnapshot({
    current: 30,
    cap: 50,
    perSecond: 1,
  });
  gameplayFacade.coinFacade.applyPersistenceSnapshot({
    current: 0,
    totalGenerated: 0,
  });
  gameplayFacade.crystalFacade.applyPersistenceSnapshot({ current: 1 });
}

function makeResearchInstant(gameplayFacade, durationSecondsByResearchId = {}) {
  const researchConfigs = gameplayFacade.researchFacade.researchDefinitionManager
    .getResearches({ includeLevelLockedAutomation: true })
    .map((research) => ({
      researchId: research.id,
      costCoin: gameplayFacade.researchFacade.researchBalanceManager.getCostCoin(research.id),
      durationSeconds: durationSecondsByResearchId[research.id] ?? 0,
      enabled: true,
    }));

  gameplayFacade.applyRuntimeConfig({ researchConfigs });
}

function createNpcMarketFacadeFake(gameplayFacade) {
  return {
    getNpcBuyPriceCoin(itemKey) {
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

function setShopAutoSellSeconds(gameplayFacade, autoSellSeconds) {
  gameplayFacade.applyRuntimeConfig({
    gameConfigs: [
      {
        configKey: 'shop',
        configJson: JSON.stringify({
          shopShelf: {
            initialUnlockedSlots: 0,
            slotCostsCoin: [0, 50, 150, 400, 1000],
            autoSellSeconds,
          },
        }),
      },
    ],
  });
}

function unlockSageSeed(gameplayFacade) {
  return gameplayFacade.buyResearch('unlockSeed:sageSeed');
}

function findResearchSnapshot(gameplayFacade, researchId) {
  return gameplayFacade
    .getSnapshot()
    .research.tabs.flatMap((tab) => tab.boxes)
    .flatMap((box) => box.researches)
    .find((research) => research.id === researchId);
}

function unlockRecipeResearch(gameplayFacade, researchId = 'unlockRecipe:manaTonic') {
  const requiredLevelByResearchId = {
    'unlockRecipe:manaTonic': 5,
    'unlockRecipe:minorHealingPotion': 6,
  };
  advanceToLevel(gameplayFacade, requiredLevelByResearchId[researchId] ?? 5);
  const research = findResearchSnapshot(gameplayFacade, researchId);
  const currentCoin = gameplayFacade.getSnapshot().coin.current;
  const costCoin = research?.costCoin ?? 0;
  if (costCoin > currentCoin) {
    gameplayFacade.coinFacade.add(costCoin - currentCoin);
  }
  return gameplayFacade.buyResearch(researchId);
}

function finishCurrentTaskLevel(gameplayFacade) {
  const tasks = gameplayFacade.getSnapshot().tasks.level.tasks;

  for (const task of tasks) {
    finishTaskRequirement(gameplayFacade, task);
  }

  gameplayFacade.coinFacade.add(gameplayFacade.getSnapshot().tasks.level.completion.costCoin);
  gameplayFacade.completeTaskLevel();
}

function finishTaskRequirement(gameplayFacade, task) {
  if (task.type === taskRequirementTypes.TURN_IN) {
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);
    gameplayFacade.fillTask(task.taskId);
    return;
  }

  gameplayFacade.tasksFacade.recordAction({
    type: task.type,
    itemKey: task.itemKey,
    researchId: task.researchId,
    quantity: task.requiredQuantity,
  });
}

function advanceToLevel(gameplayFacade, targetLevel) {
  while (gameplayFacade.getSnapshot().tasks.currentLevel < targetLevel) {
    finishCurrentTaskLevel(gameplayFacade);
  }
}

function buyGardenTilesThrough(gameplayFacade, targetTileCount) {
  while (gameplayFacade.getSnapshot().garden.plot.unlockedTiles < targetTileCount) {
    const { nextTileCost } = gameplayFacade.getSnapshot().garden.plot;
    gameplayFacade.coinFacade.add(nextTileCost);
    expect(gameplayFacade.buyGardenTile()).toMatchObject({ ok: true });
  }
}

function buyCauldronsThrough(gameplayFacade, targetCauldronCount) {
  while (gameplayFacade.getSnapshot().brewing.unlockedCauldrons < targetCauldronCount) {
    const { nextCauldronCost } = gameplayFacade.getSnapshot().brewing;
    gameplayFacade.coinFacade.add(nextCauldronCost);
    expect(gameplayFacade.buyBrewingCauldron()).toMatchObject({ ok: true });
  }
}

function openFirstNpcMarketStand(gameplayFacade) {
  advanceToLevel(gameplayFacade, 4);
  const shelf = gameplayFacade.getSnapshot().shop.shelf;
  expect(shelf).toMatchObject({ unlockedSlots: 1, selectedSlotNumber: 1 });
  return shelf;
}

function openFirstPlayerMarketStand(gameplayFacade) {
  advanceToLevel(gameplayFacade, 4);
  const shelf = gameplayFacade.getSnapshot().shop.playerShelf;
  expect(shelf).toMatchObject({ unlockedSlots: 1, selectedSlotNumber: 1 });
  return shelf;
}

describe('GameplayFacade', () => {
  it('starts a new game at level 0 with tutorial resources', () => {
    const { gameplayFacade } = createGameplay({ baseline: 'fresh' });

    expect(gameplayFacade.getSnapshot().mana).toMatchObject({
      current: 40,
      cap: 50,
      perSecond: 1,
    });
    expect(gameplayFacade.getSnapshot().coin).toMatchObject({
      current: 10,
      totalGenerated: 0,
    });
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(0);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(0);
  });

  it('restores the canonical fresh runtime instead of keeping stale in-memory progress', () => {
    const { gameplayFacade } = createGameplay({ baseline: 'fresh' });
    const freshSave = gameplayFacade.createPersistenceSave();

    gameplayFacade.manaFacade.applyPersistenceSnapshot({ current: 3 });
    gameplayFacade.coinFacade.applyPersistenceSnapshot({
      current: 90,
      totalGenerated: 80,
    });
    gameplayFacade.crystalFacade.applyPersistenceSnapshot({ current: 7 });
    gameplayFacade.itemsFacade.addItem(1, 4);
    gameplayFacade.tasksFacade.applyPersistenceSnapshot({
      currentLevel: 4,
      tasks: [],
    });

    expect(stripSaveRevision(gameplayFacade.createPersistenceSave())).not.toEqual(
      stripSaveRevision(freshSave),
    );
    expect(gameplayFacade.resetPersistenceState()).toBe(true);
    expect(stripSaveRevision(gameplayFacade.createPersistenceSave())).toEqual(
      stripSaveRevision(freshSave),
    );
  });

  it('publishes a snapshot when mana reaches the available seed summon cost', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const snapshots = [];

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10, timerDeltaSeconds: 10 });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toContain('unlockSeed:sageSeed');
    gameplayFacade.manaFacade.setCurrent(9);
    gameplayFacade.publishSnapshot();

    const unsubscribe = gameplayFacade.subscribe((snapshot) => snapshots.push(snapshot));

    ecsFacade.update({ deltaSeconds: 1, timerDeltaSeconds: 1 });
    gameplayFacade.afterUpdate({ time: Number.MAX_SAFE_INTEGER });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      mana: { current: 10 },
      seedSummoning: { canSummon: true },
    });

    unsubscribe();
  });

  it('persists gameplay progress across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.coinFacade.add(12);
    first.gameplayFacade.crystalFacade.add(2);
    first.gameplayFacade.emeraldFacade.add(1);
    first.gameplayFacade.itemsFacade.addItem(1, 3);
    first.gameplayFacade.itemsFacade.addItem(1001, 2);
    first.gameplayFacade.buyVisualSettingOption('theme', 'black');
    first.gameplayFacade.setSeedSummoningAutoEnabled(false);
    first.gameplayFacade.setSeedSummoningManaReserve(25);
    first.gameplayFacade.setSeedDropPreference('sageSeed', 'high');
    first.gameplayFacade.addBrewingIngredient(1001);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.persistence.loadRevision).toBe(1);
    expect(snapshot.coin.current).toBe(12);
    expect(snapshot.coin.totalGenerated).toBe(12);
    expect(snapshot.crystal.current).toBe(3);
    expect(snapshot.emerald.current).toBe(1);
    expect(snapshot.logs.entries).toEqual([]);
    expect(snapshot.inventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 3,
    });
    expect(snapshot.research.completedResearchIds).toEqual(['unlockSeed:sageSeed']);
    expect(snapshot.visualSettings.researched.theme.black).toBe(true);
    expect(snapshot.seedSummoning.autoSummoning).toMatchObject({
      enabled: false,
      manaReserve: 25,
    });
    expect(snapshot.seedSummoning.dropChances[0]).toMatchObject({
      key: 'sageSeed',
      dropPreference: 'high',
      preferenceWeight: 3,
    });
    expect(snapshot.brewing.ingredients).toEqual([
      {
        slotIndex: 0,
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'sage',
        kind: 'herb',
      },
    ]);
    expect(snapshot.shop.shelf.unlockedSlots).toBe(1);
    expect(snapshot.shop.playerRequests.unlockedSlots).toBe(1);
  });

  it('increments persistence load revision only when a save is restored', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().persistence.loadRevision).toBe(0);

    expect(
      gameplayFacade.loadPersistenceSave(
        {
          version: 7,
          tasks: {
            currentLevel: 2,
            tasks: [],
          },
        },
        ecsFacade,
      ),
    ).toBe(true);
    expect(gameplayFacade.getSnapshot().persistence.loadRevision).toBe(1);

    expect(gameplayFacade.loadPersistenceSave(null, ecsFacade)).toBe(false);
    expect(gameplayFacade.getSnapshot().persistence.loadRevision).toBe(1);
  });

  it('persists only changed current-level task rows', () => {
    const persistenceStorage = createMemoryStorage();
    const { gameplayFacade } = createGameplay({ baseline: 'fresh', persistenceStorage });

    const [firstTask] = gameplayFacade.getSnapshot().tasks.level.tasks;
    finishTaskRequirement(gameplayFacade, firstTask);
    gameplayFacade.itemsFacade.addItem(1, 1);
    expect(gameplayFacade.fillTask('level1-turn-in-sage-seed')).toMatchObject({ ok: true });
    gameplayFacade.savePersistenceSnapshot();

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));

    expect(saved.tasks).toEqual({
      currentLevel: 0,
      tasks: [
        {
          taskId: 'level1-summon-sage-seed',
          progressQuantity: 5,
          completed: true,
        },
        {
          taskId: 'level1-turn-in-sage-seed',
          progressQuantity: 1,
          completed: false,
        },
      ],
    });
    expect(JSON.stringify(saved).length).toBeLessThan(50_000);
  });

  it('waits to complete fully restored progress until that request becomes active', () => {
    const { gameplayFacade } = createGameplay({ baseline: 'fresh' });

    gameplayFacade.tasksFacade.applyPersistenceSnapshot({
      currentLevel: 0,
      tasks: [
        {
          taskId: 'level1-turn-in-sage-seed',
          progressQuantity: 5,
          completed: false,
        },
      ],
    });

    let task = gameplayFacade
      .getSnapshot()
      .tasks.level.tasks.find((candidate) => candidate.taskId === 'level1-turn-in-sage-seed');

    expect(task).toMatchObject({
      progressQuantity: 5,
      completed: false,
      canFill: false,
      canComplete: false,
    });

    const activeTask = gameplayFacade
      .getSnapshot()
      .tasks.level.tasks.find((candidate) => candidate.isActiveQuest);
    finishTaskRequirement(gameplayFacade, activeTask);
    task = gameplayFacade
      .getSnapshot()
      .tasks.level.tasks.find((candidate) => candidate.taskId === 'level1-turn-in-sage-seed');

    expect(task.completed).toBe(true);
  });

  it('clamps restored garden and market capacity to the saved player level', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        coin: {},
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

  it('grandfathers old level-cap plots and cauldrons into capacity research', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        coin: {},
        crystal: {},
        logs: {},
        inventory: [],
        research: {
          completedIds: [],
        },
        brewing: {
          unlockedCauldrons: 3,
          cauldrons: [
            { cauldronNumber: 1, cauldronItemKeys: [], activeBrew: null },
            { cauldronNumber: 2, cauldronItemKeys: [], activeBrew: null },
            { cauldronNumber: 3, cauldronItemKeys: [], activeBrew: null },
          ],
        },
        garden: {
          unlockedTiles: 10,
          tiles: [],
        },
        tasks: {
          currentLevel: 17,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const snapshot = gameplayFacade.getSnapshot();

    expect(snapshot.garden.plot.unlockedTiles).toBe(10);
    expect(snapshot.brewing.unlockedCauldrons).toBe(3);
    expect(snapshot.research.completedResearchIds).toEqual(
      expect.arrayContaining([
        capacityResearchIds.plot(6),
        capacityResearchIds.plot(10),
        capacityResearchIds.cauldron(3),
      ]),
    );
  });

  it('locks empty legacy Brewing cauldrons that used to appear from player level', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        coin: {},
        crystal: {},
        logs: {},
        inventory: [],
        research: {
          completedIds: [],
        },
        brewing: {
          cauldrons: [
            { cauldronNumber: 1, cauldronItemKeys: [], activeBrew: null },
            { cauldronNumber: 2, cauldronItemKeys: [], activeBrew: null },
            { cauldronNumber: 3, cauldronItemKeys: [], activeBrew: null },
          ],
        },
        tasks: {
          currentLevel: 5,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const brewing = gameplayFacade.getSnapshot().brewing;

    expect(brewing.maxCauldrons).toBe(2);
    expect(brewing.unlockedCauldrons).toBe(1);
    expect(brewing.cauldrons).toHaveLength(1);
    expect(brewing.nextCauldronNumber).toBe(2);
  });

  it('keeps non-empty legacy Brewing cauldrons unlocked to avoid losing staged progress', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        coin: {},
        crystal: {},
        logs: {},
        inventory: [{ itemKey: 'sageHerb', quantity: 3 }],
        research: {
          completedIds: [],
        },
        brewing: {
          cauldrons: [
            { cauldronNumber: 1, cauldronItemKeys: [], activeBrew: null },
            { cauldronNumber: 2, cauldronItemKeys: ['sageHerb'], activeBrew: null },
            { cauldronNumber: 3, cauldronItemKeys: [], activeBrew: null },
          ],
        },
        tasks: {
          currentLevel: 5,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const brewing = gameplayFacade.getSnapshot().brewing;

    expect(brewing.unlockedCauldrons).toBe(2);
    expect(brewing.cauldrons).toHaveLength(2);
    expect(brewing.cauldrons[1].ingredients).toHaveLength(1);
    expect(brewing.nextCauldronNumber).toBe(3);
  });

  it('fills tasks from inventory and advances player level after coin payment', () => {
    const { gameplayFacade } = createGameplay();
    const tasks = gameplayFacade.getSnapshot().tasks.level.tasks;
    const task = tasks.find((candidate) => candidate.type === taskRequirementTypes.TURN_IN);
    for (const earlierTask of tasks.slice(0, tasks.indexOf(task))) {
      finishTaskRequirement(gameplayFacade, earlierTask);
    }
    const partialQuantity = task.requiredQuantity - 1;

    expect(gameplayFacade.getSnapshot().tasks.maxLevel).toBe(100);
    expect(gameplayFacade.getSnapshot().tasks.level.totalTasks).toBe(3);
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, partialQuantity);

    expect(gameplayFacade.fillTask(task.taskId)).toMatchObject({
      ok: true,
      quantity: partialQuantity,
      progressQuantity: partialQuantity,
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
      quantity: task.requiredQuantity - partialQuantity,
      progressQuantity: task.requiredQuantity,
      maxed: true,
      completed: true,
    });
    expect(
      gameplayFacade.getSnapshot().tasks.level.tasks.find(
        (candidate) => candidate.taskId === task.taskId,
      ),
    ).toMatchObject({
      completed: true,
      canComplete: false,
    });
    expect(gameplayFacade.completeTask(task.taskId)).toMatchObject({
      ok: false,
      reason: 'already_completed',
      taskId: task.taskId,
    });

    const remainingTasks = gameplayFacade.getSnapshot().tasks.level.tasks.filter(
      (candidate) => !candidate.completed,
    );

    for (const remainingTask of remainingTasks) {
      finishTaskRequirement(gameplayFacade, remainingTask);
    }

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(1);
    expect(gameplayFacade.getSnapshot().tasks.level.completion).toMatchObject({
      level: 1,
      costCoin: 4,
      canComplete: true,
    });
    expect(gameplayFacade.completeTaskLevel()).toMatchObject({
      ok: false,
      reason: 'not_enough_coin',
      costCoin: 4,
    });

    gameplayFacade.coinFacade.add(4);
    expect(gameplayFacade.completeTaskLevel()).toMatchObject({
      ok: true,
      currentLevel: 2,
      advanced: true,
      costCoin: 4,
    });
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().tasks.level.totalTasks).toBe(3);
    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
  });

  it('collects progress for only the active elara request', () => {
    const { gameplayFacade } = createGameplay();
    const [activeRequest, laterRequest] = gameplayFacade.getSnapshot().tasks.level.tasks;

    expect(activeRequest.isActiveQuest).toBe(true);
    expect(laterRequest.isActiveQuest).toBe(false);
    expect(
      gameplayFacade.tasksFacade.recordAction({
        type: laterRequest.type,
        itemKey: laterRequest.itemKey,
        researchId: laterRequest.researchId,
        quantity: laterRequest.requiredQuantity,
      }),
    ).toMatchObject({ ok: false, updates: [] });
    expect(gameplayFacade.getSnapshot().tasks.level.questProgress.completedQuests).toBe(0);

    finishTaskRequirement(gameplayFacade, activeRequest);

    expect(gameplayFacade.getSnapshot().tasks.level.questProgress).toMatchObject({
      completedQuests: 1,
      activeQuest: {
        kind: 'task',
        taskId: laterRequest.taskId,
      },
    });
  });

  it('persists task progress and player level', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    finishCurrentTaskLevel(first.gameplayFacade);
    const tasks = first.gameplayFacade.getSnapshot().tasks.level.tasks;
    const task = tasks.find((candidate) => candidate.type === taskRequirementTypes.TURN_IN);
    for (const earlierTask of tasks.slice(0, tasks.indexOf(task))) {
      finishTaskRequirement(first.gameplayFacade, earlierTask);
    }
    const partialQuantity = task.requiredQuantity - 1;
    first.gameplayFacade.itemsFacade.addItem(task.itemTypeId, partialQuantity);
    first.gameplayFacade.fillTask(task.taskId);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.tasks.currentLevel).toBe(2);
    expect(
      snapshot.tasks.level.tasks.find((candidate) => candidate.taskId === task.taskId),
    ).toMatchObject({
      taskId: task.taskId,
      progressQuantity: partialQuantity,
      completed: false,
    });
  });

  it('keeps a completed task level unpaid across reload', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });
    const tasks = first.gameplayFacade.getSnapshot().tasks.level.tasks;

    for (const task of tasks) {
      finishTaskRequirement(first.gameplayFacade, task);
    }

    const costCoin = first.gameplayFacade.getSnapshot().tasks.level.completion.costCoin;
    first.gameplayFacade.coinFacade.add(costCoin);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.tasks.currentLevel).toBe(1);
    expect(snapshot.tasks.level.completion).toMatchObject({
      level: 1,
      costCoin,
      canComplete: true,
    });
    expect(snapshot.coin.current).toBe(costCoin);
  });

  it('keeps task requirements out of market sell reservations', () => {
    const { gameplayFacade } = createGameplay();
    const [task] = gameplayFacade.getSnapshot().tasks.level.tasks;

    openFirstPlayerMarketStand(gameplayFacade);
    gameplayFacade.itemsFacade.addItem(task.itemTypeId, task.requiredQuantity);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems.find(
      (item) => item.itemTypeId === task.itemTypeId,
    )).toMatchObject({
      quantity: task.requiredQuantity,
    });

    expect(gameplayFacade.setSelectedPlayerShopShelfSlotListing({
      itemTypeId: task.itemTypeId,
      quantity: task.requiredQuantity,
      priceCoin: 1,
    })).toMatchObject({
      ok: true,
      quantity: task.requiredQuantity,
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

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);
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

  it('completes prestige, resets run data, and keeps emeralds plus prestige rubies', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.crystalFacade.add(8);
    gameplayFacade.emeraldFacade.add(7);
    gameplayFacade.coinFacade.add(99);
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
    expect(snapshot.tasks.currentLevel).toBe(5);
    expect(snapshot.tasks.level.level).toBe(5);
    expect(snapshot.playerLevel.currentLevel).toBe(5);
    expect(snapshot.prestige.completedLevels).toEqual([10]);
    expect(snapshot.prestige.earnedRuby).toBe(1);
    expect(snapshot.ruby.current).toBe(1);
    expect(snapshot.coin).toMatchObject({ current: 0, totalGenerated: 0 });
    expect(snapshot.crystal.current).toBe(5);
    expect(snapshot.emerald.current).toBe(7);
    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.research.completedResearchIds).toEqual(['unlockSeed:sageSeed']);
    expect(snapshot.brewing.ingredients).toEqual([]);
    expect(snapshot.shop.shelf.selectedSlotNumber).toBe(1);
    expect(snapshot.logs.entries).toEqual([]);
    expect(snapshot.visualSettings.researched.theme.black).toBe(true);
    expect(snapshot.mana).toMatchObject({
      current: 0,
      cap: 250,
      perSecond: 5,
    });
  }, 30_000);

  it('keeps personal daily and weekly task progress after prestige', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 10);

    const personalTasks = gameplayFacade.getSnapshot().personalTasks;
    const dailyPeriodKey = personalTasks.daily.periodKey;
    const weeklyPeriodKey = personalTasks.weekly.periodKey;

    for (const task of personalTasks.daily.tasks) {
      gameplayFacade.recordPersonalTaskAction(task.actionType, task.requiredQuantity);
    }

    expect(gameplayFacade.claimPersonalTaskMilestoneReward('daily', 30)).toMatchObject({
      ok: true,
      periodType: 'daily',
      milestoneThreshold: 30,
    });
    expect(gameplayFacade.claimPersonalTaskMilestoneReward('weekly', 100)).toMatchObject({
      ok: true,
      periodType: 'weekly',
      milestoneThreshold: 100,
    });

    const beforePrestige = gameplayFacade.getSnapshot().personalTasks;
    expect(beforePrestige.daily.currentPoints).toBe(100);
    expect(beforePrestige.weekly.currentPoints).toBe(100);
    expect(beforePrestige.daily.completedTasks).toBe(7);

    expect(gameplayFacade.completePrestigeMilestone(10)).toMatchObject({ ok: true });

    const afterPrestige = gameplayFacade.getSnapshot().personalTasks;
    expect(afterPrestige.daily).toMatchObject({
      periodKey: dailyPeriodKey,
      currentPoints: 100,
      completedTasks: 7,
    });
    expect(afterPrestige.weekly).toMatchObject({
      periodKey: weeklyPeriodKey,
      currentPoints: 100,
    });
    expect(
      afterPrestige.daily.rewards.find((reward) => reward.threshold === 30),
    ).toMatchObject({ claimed: true, claimable: false });
    expect(
      afterPrestige.weekly.rewards.find((reward) => reward.threshold === 100),
    ).toMatchObject({ claimed: true, claimable: false });
  }, 30_000);

  it('restores sage seed medium priority after prestige when other seed preferences reset away', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 3);
    gameplayFacade.coinFacade.add(25);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
    });
    expect(gameplayFacade.setSeedDropPreference('sageSeed', 'none')).toMatchObject({
      ok: true,
      preference: 'none',
    });

    advanceToLevel(gameplayFacade, 10);
    expect(gameplayFacade.completePrestigeMilestone(10)).toMatchObject({ ok: true });

    expect(gameplayFacade.getSnapshot().seedSummoning.dropChances).toMatchObject([
      {
        key: 'sageSeed',
        dropPreference: 'medium',
        preferenceWeight: 2,
        effectiveDropWeight: 2,
        dropChance: 1,
      },
    ]);

    ecsFacade.update({ deltaSeconds: 2 });
    expect(gameplayFacade.getSnapshot().seedSummoning.canSummon).toBe(true);
    expect(gameplayFacade.summonSeed()).toMatchObject({
      ok: true,
      seed: {
        key: 'sageSeed',
      },
    });
  }, 30_000);

  it('resets to half of the completed prestige milestone level', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 40);

    expect(gameplayFacade.completePrestigeMilestone(40)).toMatchObject({
      ok: true,
      milestone: { level: 40 },
    });
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(20);
    expect(gameplayFacade.getSnapshot().playerLevel.currentLevel).toBe(20);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(20);
  }, 30_000);

  it('auto-credits lower unclaimed prestige milestones when claiming higher', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 40);

    const level40 = gameplayFacade
      .getSnapshot()
      .prestige.milestones.find((milestone) => milestone.level === 40);
    expect(level40).toMatchObject({
      canComplete: true,
      creditedLevels: [10, 20, 30, 40],
      creditedRuby: 4,
      nextRun: {
        ruby: 4,
      },
    });

    expect(gameplayFacade.completePrestigeMilestone(40)).toMatchObject({
      ok: true,
      milestone: { level: 40 },
      creditedLevels: [10, 20, 30, 40],
      completedLevels: [10, 20, 30, 40],
      earnedRuby: 4,
      currentRuby: 4,
    });
    expect(gameplayFacade.getSnapshot().prestige.completedLevels).toEqual([
      10,
      20,
      30,
      40,
    ]);
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(
      getPrestigeResetLevel(40),
    );
  }, 30_000);

  it('derives early prestige unlocks from completed prestige count', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.setPrestigeRunFocus('capacity')).toMatchObject({
      ok: true,
      runFocus: 'none',
    });

    advanceToLevel(gameplayFacade, 30);
    expect(gameplayFacade.completePrestigeMilestone(30)).toMatchObject({
      ok: true,
      completedLevels: [10, 20, 30],
    });
    expect(gameplayFacade.getSnapshot().prestige.unlocks.slice(0, 3)).toMatchObject([
      { id: 'advancedCapacity', unlocked: true },
      { id: 'runFocus', unlocked: true },
      { id: 'automationReserveControls', unlocked: false },
    ]);
    expect(gameplayFacade.setPrestigeRunFocus('capacity')).toMatchObject({
      ok: true,
      runFocus: 'capacity',
    });
    expect(gameplayFacade.getSnapshot().prestige.runFocus).toMatchObject({
      unlocked: true,
      selected: 'capacity',
    });
    expect(gameplayFacade.buyResearch(automationReserveResearchIds.controls(1))).toMatchObject({
      ok: false,
      reason: 'missing_required_prestige',
      requiredPrestigeCount: 4,
    });

    advanceToLevel(gameplayFacade, 40);
    expect(gameplayFacade.completePrestigeMilestone(40)).toMatchObject({
      ok: true,
      completedLevels: [10, 20, 30, 40],
    });
    expect(
      gameplayFacade.getSnapshot().seedSummoning.autoSummoning.reserveControlsUnlocked,
    ).toBe(true);
    gameplayFacade.emeraldFacade.add(1);
    expect(gameplayFacade.buyResearch(automationReserveResearchIds.controls(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'emerald',
    });
    expect(
      gameplayFacade.getSnapshot().seedSummoning.autoSummoning.reservePresetFractions,
    ).toContain(0.75);
  }, 30_000);

  it('uses prestige-gated permanent research for extra plots and cauldrons', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 25);
    buyGardenTilesThrough(gameplayFacade, 5);
    buyCauldronsThrough(gameplayFacade, 2);

    expect(gameplayFacade.getSnapshot().garden.plot).toMatchObject({
      unlockedTiles: 5,
      nextTileNumber: 6,
      nextTileLockedByResearch: true,
      nextTileRequiresResearchId: capacityResearchIds.plot(6),
    });
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      unlockedCauldrons: 2,
      nextCauldronNumber: 3,
      nextCauldronLockedByResearch: true,
      nextCauldronRequiresResearchId: capacityResearchIds.cauldron(3),
    });
    expect(gameplayFacade.buyResearch(capacityResearchIds.plot(6))).toMatchObject({
      ok: false,
      reason: 'missing_required_prestige',
      requiredPrestigeCount: 1,
      cost: 1,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.buyResearch(capacityResearchIds.cauldron(3))).toMatchObject({
      ok: false,
      reason: 'missing_required_prestige',
      requiredPrestigeCount: 1,
      cost: 1,
      costCurrency: 'emerald',
    });

    gameplayFacade.completePrestigeMilestone(10, { confirmedLower: true });
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(getPrestigeResetLevel(10));
    gameplayFacade.emeraldFacade.add(1);
    expect(gameplayFacade.buyResearch(capacityResearchIds.plot(6))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.getSnapshot().emerald.current).toBe(0);
    buyGardenTilesThrough(gameplayFacade, 6);
    expect(gameplayFacade.getSnapshot().garden.plot).toMatchObject({
      unlockedTiles: 6,
      nextTileNumber: 7,
      nextTileLockedByResearch: true,
      nextTileRequiresResearchId: capacityResearchIds.plot(7),
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoPlantTile(6))).toMatchObject({
      id: automationResearchIds.autoPlantTile(6),
      costRuby: 6,
      costCurrency: 'ruby',
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoHarvestPlant(6))).toMatchObject({
      id: automationResearchIds.autoHarvestPlant(6),
      costRuby: 6,
      costCurrency: 'ruby',
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoPlantTile(7))).toBeUndefined();

    advanceToLevel(gameplayFacade, 20);
    gameplayFacade.completePrestigeMilestone(20);
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toContain(
      capacityResearchIds.plot(6),
    );
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(2);
    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(getPrestigeResetLevel(20));

    expect(gameplayFacade.buyResearch(capacityResearchIds.cauldron(3))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'emerald',
    });
    buyCauldronsThrough(gameplayFacade, 3);
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      unlockedCauldrons: 3,
      nextCauldronNumber: 4,
      nextCauldronLockedByResearch: true,
      nextCauldronRequiresResearchId: capacityResearchIds.cauldron(4),
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoBrewCauldron(3))).toMatchObject({
      id: automationResearchIds.autoBrewCauldron(3),
      costRuby: 3,
      costCurrency: 'ruby',
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoBottleCauldron(3))).toMatchObject({
      id: automationResearchIds.autoBottleCauldron(3),
      costRuby: 3,
      costCurrency: 'ruby',
    });
    expect(findResearchSnapshot(gameplayFacade, automationResearchIds.autoBrewCauldron(4))).toBeUndefined();
  }, 30_000);

  it('announces prestige completions to world chat', () => {
    const { gameplayFacade } = createGameplay();
    const prestigeAnnouncements = [];

    advanceToLevel(gameplayFacade, 10);

    gameplayFacade.setWorldChatFacade({
      announcePrestige: (prestige) => {
        prestigeAnnouncements.push(prestige);
        return Promise.resolve({ ok: true, ...prestige });
      },
    });

    gameplayFacade.completePrestigeMilestone(10);

    expect(prestigeAnnouncements).toEqual([
      {
        prestigeCount: 1,
        playerLevel: 10,
      },
    ]);
  }, 30_000);

  it('announces auto-credited prestige count to world chat', () => {
    const { gameplayFacade } = createGameplay();
    const prestigeAnnouncements = [];

    advanceToLevel(gameplayFacade, 40);

    gameplayFacade.setWorldChatFacade({
      announcePrestige: (prestige) => {
        prestigeAnnouncements.push(prestige);
        return Promise.resolve({ ok: true, ...prestige });
      },
    });

    gameplayFacade.completePrestigeMilestone(40);

    expect(prestigeAnnouncements).toEqual([
      {
        prestigeCount: 4,
        playerLevel: 40,
      },
    ]);
  }, 30_000);

  it('persists prestige reset data with settings, emeralds, and prestige progress kept', () => {
    const persistenceStorage = createMemoryStorage();
    const { gameplayFacade } = createGameplay({ persistenceStorage });

    gameplayFacade.crystalFacade.add(8);
    gameplayFacade.emeraldFacade.add(7);
    gameplayFacade.coinFacade.add(99);
    gameplayFacade.buyVisualSettingOption('theme', 'black');
    gameplayFacade.buyResearch('unlockSeed:sageSeed');
    advanceToLevel(gameplayFacade, 10);

    gameplayFacade.completePrestigeMilestone(10);

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    expect(saved).toMatchObject({
      coin: { current: 0, totalGenerated: 0 },
      crystal: { current: 5 },
      emerald: { current: 7 },
      ruby: { current: 1 },
      inventory: [],
      research: { completedIds: ['unlockSeed:sageSeed'] },
      prestige: { completedLevels: [10] },
      visualSettings: {
        researched: {
          theme: {
            black: true,
          },
        },
      },
      tasks: {
        currentLevel: 5,
      },
    });
  }, 30_000);

  it('persists and reloads a second prestige reset without losing permanent progress', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    advanceToLevel(first.gameplayFacade, 10);
    expect(first.gameplayFacade.completePrestigeMilestone(10)).toMatchObject({
      ok: true,
      milestone: { level: 10 },
      currentRuby: 1,
    });

    advanceToLevel(first.gameplayFacade, 20);
    expect(first.gameplayFacade.completePrestigeMilestone(20)).toMatchObject({
      ok: true,
      milestone: { level: 20 },
      currentRuby: 2,
      completedLevels: [10, 20],
    });

    const saved = JSON.parse(persistenceStorage.getItem('idle-wizard.gameplay.save'));
    expect(saved).toMatchObject({
      coin: { current: 0, totalGenerated: 0 },
      gold: { current: 0, totalGenerated: 0 },
      crystal: { current: 10 },
      ruby: { current: 2 },
      inventory: [],
      research: { completedIds: ['unlockSeed:sageSeed'] },
      prestige: { completedLevels: [10, 20] },
      tasks: { currentLevel: getPrestigeResetLevel(20) },
    });

    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.tasks.currentLevel).toBe(getPrestigeResetLevel(20));
    expect(snapshot.playerLevel.currentLevel).toBe(getPrestigeResetLevel(20));
    expect(snapshot.prestige.completedLevels).toEqual([10, 20]);
    expect(snapshot.prestige.earnedRuby).toBe(2);
    expect(snapshot.ruby.current).toBe(2);
    expect(snapshot.coin).toMatchObject({ current: 0, totalGenerated: 0 });
    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.research.completedResearchIds).toEqual(
      expect.arrayContaining([
        'unlockSeed:sageSeed',
        capacityResearchIds.plot(6),
        capacityResearchIds.plot(8),
      ]),
    );

    second.gameplayFacade.shutdown();
    second.ecsFacade.destroyWorld();
  }, 30_000);

  it('completes a selected available prestige milestone', () => {
    const { gameplayFacade } = createGameplay();
    advanceToLevel(gameplayFacade, 20);

    expect(gameplayFacade.completePrestigeMilestone(10)).toMatchObject({
      ok: true,
      milestone: {
        level: 10,
      },
    });
    expect(gameplayFacade.getSnapshot().prestige.completedLevels).toEqual([10]);
  }, 30_000);

  it('clamps loaded ruby to completed prestige rewards without refilling spent ruby', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        coin: {},
        crystal: { current: 0 },
        ruby: { current: 9 },
        inventory: [],
        prestige: {
          completedLevels: [20],
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
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(2);
  });

  it('restores earned ruby when advanced research now uses emerald', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 3,
        mana: {},
        coin: {},
        crystal: { current: 0 },
        ruby: { current: 0 },
        inventory: [],
        prestige: {
          completedLevels: [10, 20],
        },
        research: {
          completedIds: [advancedResearchIds.cauldronBrewing(1, 1)],
        },
        tasks: {
          currentLevel: 10,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().prestige.earnedRuby).toBe(2);
    expect(gameplayFacade.getSnapshot().prestige.completedLevels).toEqual([10, 20]);
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(2);
  });

  it('resets crystal level-up costs with the next run', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.crystalFacade.add(6);
    expect(gameplayFacade.buyResearch(emeraldResearchIds.plotPlanting(1, 2))).toMatchObject({
      ok: true,
      cost: 2,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.buyResearch(emeraldResearchIds.plotPlanting(1, 3))).toMatchObject({
      ok: true,
      cost: 4,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);
    expect(gameplayFacade.createPersistenceSave().research.crystalCostById).toMatchObject({
      [emeraldResearchIds.plotPlanting(1, 2)]: 2,
      [emeraldResearchIds.plotPlanting(1, 3)]: 4,
    });

    advanceToLevel(gameplayFacade, 10);
    gameplayFacade.completePrestigeMilestone(10);

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(
      gameplayFacade.playerLevelFacade.getCrystalRewardThroughLevel(getPrestigeResetLevel(10)),
    );
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).not.toContain(
      emeraldResearchIds.plotPlanting(1, 2),
    );
  });

  it('backfills missed level crystals when loading old saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        coin: {},
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
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);
  });

  it('does not duplicate existing level crystals when loading saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        coin: {},
        crystal: { current: 3 },
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
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);
  });

  it('counts spent crystal research when backfilling old saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        coin: {},
        crystal: { current: 0 },
        inventory: [],
        research: {
          completedIds: [emeraldResearchIds.plotPlanting(1, 2)],
        },
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

  it('counts in-progress crystal research when backfilling old saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 2,
        mana: {},
        coin: {},
        crystal: { current: 1 },
        inventory: [],
        research: {
          completedIds: [],
          inProgress: [
            {
              researchId: emeraldResearchIds.plotPlanting(1, 2),
              totalSeconds: 30,
              remainingSeconds: 12,
            },
          ],
        },
        tasks: {
          currentLevel: 3,
          tasks: [],
        },
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(3);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);
    expect(gameplayFacade.getSnapshot().research.inProgressResearches).toEqual([
      expect.objectContaining({
        researchId: emeraldResearchIds.plotPlanting(1, 2),
      }),
    ]);
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

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(3);

    finishCurrentTaskLevel(gameplayFacade);

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(6);
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
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(2);
  });

  it('uses legacy SpacetimeDB task completion costs without falling back', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'tasks',
          configJson: JSON.stringify({
            levels: [
              {
                level: 1,
                completionCostGold: 7,
                tasks: [{ id: 'level1-sage-seeds', itemKey: 'sageSeed', quantity: 4 }],
              },
            ],
          }),
        },
      ],
    });

    expect(gameplayFacade.getSnapshot().tasks.level.completion.costCoin).toBe(7);
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
              tileCostsCoin: [0, 11],
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
              slotCostsCoin: [0, 22],
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
      slotCosts: [],
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

  it('logs completed gameplay events', async () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    await gameplayFacade.sellNpcMarketItem(summonResult.seed.id, 1);

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

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.plantGardenSeed(1, 1);
    ecsFacade.update({ deltaSeconds: 60 });
    gameplayFacade.startGardenHarvest(1);
    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toEqual([
      'summoned sage seed',
      'sold sage seed for 1 coin',
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
      coin: 1,
      quantity: 1,
    });
    expect(rewardEvents[2]).toMatchObject({
      type: 'potion_collected',
      cauldronIndex: 0,
      cauldronNumber: 1,
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

  it('publishes reward events when personal task rewards are claimed', () => {
    const { gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    advanceToLevel(gameplayFacade, 4);

    const dailyTasks = gameplayFacade.getSnapshot().personalTasks.daily.tasks;
    for (const task of dailyTasks.slice(0, 3)) {
      gameplayFacade.recordPersonalTaskAction(task.actionType, task.requiredQuantity);
    }
    const dailyClaim = gameplayFacade.claimPersonalTaskMilestoneReward('daily', 30);

    for (const task of gameplayFacade.getSnapshot().personalTasks.daily.tasks.slice(3)) {
      gameplayFacade.recordPersonalTaskAction(task.actionType, task.requiredQuantity);
    }
    const weeklyClaim = gameplayFacade.claimPersonalTaskMilestoneReward('weekly', 100);

    expect(dailyClaim).toMatchObject({
      ok: true,
      periodType: 'daily',
      milestoneThreshold: 30,
    });
    expect(weeklyClaim).toMatchObject({
      ok: true,
      periodType: 'weekly',
      milestoneThreshold: 100,
    });
    expect(rewardEvents).toEqual([
      expect.objectContaining({
        type: 'personal_task_reward_claimed',
        periodType: 'daily',
        taskId: dailyClaim.taskId,
        milestoneThreshold: 30,
        coin: dailyClaim.coin,
        crystal: dailyClaim.crystal,
      }),
      expect.objectContaining({
        type: 'personal_task_reward_claimed',
        periodType: 'weekly',
        taskId: weeklyClaim.taskId,
        milestoneThreshold: 100,
        coin: weeklyClaim.coin,
        crystal: weeklyClaim.crystal,
      }),
    ]);
    unsubscribeRewardEvents();
  });

  it('ignores corrupt gameplay saves', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem('idle-wizard.gameplay.save', '{broken');

    const { gameplayFacade } = createGameplay({ persistenceStorage });

    expect(gameplayFacade.getSnapshot()).toMatchObject({
      coin: { current: 0 },
      crystal: { current: 1 },
      inventory: [],
      research: { completedResearchIds: ['unlockSeed:sageSeed'] },
    });
  });

  it('migrates version 1 gameplay saves without wiping progress', () => {
    const persistenceStorage = createMemoryStorage();
    persistenceStorage.setItem(
      'idle-wizard.gameplay.save',
      JSON.stringify({
        version: 1,
        coin: {
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

    expect(snapshot.coin.current).toBe(12);
    expect(snapshot.coin.totalGenerated).toBe(18);
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
    expect(snapshot.tasks.level.tasks).toHaveLength(3);
    expect(gameplayFacade.consumeProgressResetPending()).toBe(false);
  });

  it('keeps inventory quantities above the old save cap across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.itemsFacade.addItem(1, 25_000);
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 25_000,
    });
  });

  it('persists active brew timers across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.itemsFacade.addItem(1001, 3);
    first.gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(first.gameplayFacade);
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
    first.gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(first.gameplayFacade);
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
        coin: {},
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

    expect(second.gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
    ]);
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
      current: 1,
    });

    gameplayFacade.crystalFacade.add(5);

    expect(gameplayFacade.getSnapshot().crystal.current).toBe(6);
    expect(gameplayFacade.crystalFacade.spend(2)).toBe(true);
    expect(gameplayFacade.crystalFacade.spend(5)).toBe(false);
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(4);
  });

  it('researches visual settings from runtime config and spends crystal', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.applyRuntimeConfig({
      gameConfigs: [
        {
          configKey: 'visualSettings',
          configJson: JSON.stringify({
            costsCrystal: {
              theme: { black: 2, midnight: 0, witchcraft: 0 },
              font: { lexend: 0, 'comic-sans-mono': 0 },
              progressBar: { regular: 0, gradient: 0 },
            },
          }),
        },
      ],
    });

    expect(gameplayFacade.getSnapshot().visualSettings.costsCrystal.theme.black).toBe(2);
    expect(gameplayFacade.getSnapshot().visualSettings.researched).toMatchObject({
      theme: { black: false, midnight: true, witchcraft: false },
      font: {
        lexend: true,
        'comic-sans-mono': false,
      },
      progressBar: { regular: true, gradient: false },
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
    expect(gameplayFacade.getSnapshot().crystal.current).toBe(1);
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

    ecsFacade.update({ deltaSeconds: 10 });
    expect(gameplayFacade.getSnapshot().seedSummoning.canSummon).toBe(true);
    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(10);
    expect(result.quantity).toBe(1);
    expect(result.seed.dropWeight).toBe(1);
    expect(result.seed.key).toBe('sageSeed');
    expect(snapshot.mana.current).toBe(30);
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
    expect(snapshot.seedInventory).toHaveLength(24);
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

    gameplayFacade.coinFacade.add(600);
    expect(gameplayFacade.buyResearch('summonSeedsX2')).toEqual({
      ok: true,
      researchId: 'summonSeedsX2',
      cost: 600,
    });
    ecsFacade.update({ deltaSeconds: 20 });

    expect(gameplayFacade.getSnapshot().seedSummoning).toEqual({
      cost: 20,
      quantity: 2,
      canSummon: true,
      autoSummoning: {
        unlocked: false,
        enabled: true,
        manaReserve: 0,
        maxManaReserve: 5000,
        reserveControlsUnlocked: false,
        reservePresetFractions: [0, 0.25, 0.5],
        reserveStep: 100,
      },
      dropChances: [
        {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
          baseDropWeight: 1,
          dropPreference: 'medium',
          preferenceWeight: 2,
          dropWeight: 1,
          effectiveDropWeight: 2,
          dropChance: 1,
        },
      ],
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
    expect(snapshot.mana.current).toBe(30);
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
    gameplayFacade.researchFacade.researchStateEntityManager.defaultCompletedResearchIds = [];
    gameplayFacade.researchFacade.researchStateEntityManager.setCompletedResearchIds([]);

    ecsFacade.update({ deltaSeconds: 10 });
    const result = gameplayFacade.summonSeed();
    const snapshot = gameplayFacade.getSnapshot();

    expect(result).toEqual({
      ok: false,
      reason: 'no_summonable_seeds',
      cost: 10,
    });
    expect(snapshot.mana.current).toBe(40);
    expect(snapshot.seedSummoning.canSummon).toBe(false);
    expect(snapshot.inventory).toEqual([]);
  });

  it('rejects seed summoning without enough mana', () => {
    const { gameplayFacade } = createGameplay();
    gameplayFacade.manaFacade.setCurrent(0);

    const result = gameplayFacade.summonSeed();

    expect(result).toEqual({
      ok: false,
      reason: 'not_enough_mana',
      cost: 10,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().seedInventory).toHaveLength(24);
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
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 24,
      key: 'pearlrootSeed',
      label: 'pearlroot seed',
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
      'emerald',
    ]);
    expect(research.tabs[1].label).toBe('automation');
    expect(research.tabs[1].boxes.map((box) => box.id)).toEqual([
      'autoSeedSpawn',
      'autoPlantTiles',
      'autoHarvestTiles',
      'autoBrewCauldrons',
      'autoBottleCauldrons',
    ]);
    expect(research.tabs[1].boxes[0].researches[0]).toEqual({
      id: automationResearchIds.autoSeedSpawn(),
      label: 'auto seed spawn',
      value: '2 ruby',
      effect: 'auto',
      description: 'summons researched seeds when enough mana is available.',
      costCoin: 0,
      costRuby: 2,
      costCurrency: 'ruby',
      completed: false,
      canResearch: false,
    });
    expect(research.tabs[1].boxes[1].researches[0]).toEqual({
      id: automationResearchIds.autoPlantTile(1),
      label: 'auto plant tile 1',
      value: '1 ruby',
      effect: 'auto',
      description: 'garden tile 1 plants its selected seed when one is available.',
      costCoin: 0,
      costRuby: 1,
      costCurrency: 'ruby',
      completed: false,
      canResearch: false,
    });
    expect(research.tabs[1].boxes[1].researches[1]).toMatchObject({
      id: automationResearchIds.autoPlantTile(2),
      label: 'auto plant tile 2',
      value: 'locked',
      requiredResearchIds: [automationResearchIds.autoPlantTile(1)],
      costCoin: 0,
      costRuby: 2,
      costCurrency: 'ruby',
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
    expect(research.tabs[1].boxes[3].researches[0]).toMatchObject({
      id: automationResearchIds.autoBrewCauldron(1),
      label: 'auto brew cauldron 1',
      value: '1 ruby',
      description:
        'cauldron 1 starts brewing when staged ingredients and mana are ready.',
      costCoin: 0,
      costRuby: 1,
      costCurrency: 'ruby',
    });
    expect(research.tabs[2].boxes.map((box) => box.id)).toEqual([
      'fastSell',
      'researchCost',
      'researchTime',
      'automationReserve',
      'plotCapacity',
      'cauldronCapacity',
      'cauldronBrewing',
      'plotGrowth',
    ]);
    expect(research.tabs[2].boxes[0].researches.map((research) => research.id)).toEqual([
      fastSellResearchIds.payout(1),
    ]);
    expect(research.tabs[2].boxes[0].researches[0]).toMatchObject({
      id: fastSellResearchIds.payout(1),
      label: 'haggling lvl 1',
      value: '2 emerald',
      effect: '85% payout',
      showEffect: true,
      requiredResearchIds: [],
      costCoin: 0,
      costEmerald: 2,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[1].researches.map((research) => research.id)).toEqual([
      researchCostResearchIds.reduction(1),
    ]);
    expect(research.tabs[2].boxes[1].researches[0]).toMatchObject({
      id: researchCostResearchIds.reduction(1),
      label: 'research cost lvl 1',
      value: '1 emerald',
      effect: '-10% cost',
      costCoin: 0,
      costEmerald: 1,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[2].researches.map((research) => research.id)).toEqual([
      researchTimeResearchIds.reduction(1),
    ]);
    expect(research.tabs[2].boxes[2].researches[0]).toMatchObject({
      id: researchTimeResearchIds.reduction(1),
      label: 'research time lvl 1',
      value: '1 emerald',
      effect: '-10% time',
      showEffect: true,
      requiredResearchIds: [],
      costCoin: 0,
      costEmerald: 1,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[4].researches.map((research) => research.id)).toEqual([
      capacityResearchIds.plot(6),
    ]);
    expect(research.tabs[2].boxes[4].researches[0]).toMatchObject({
      id: capacityResearchIds.plot(6),
      label: 'plot 6 capacity',
      value: 'locked',
      effect: '+1 plot',
      showEffect: true,
      requiredPrestigeCount: 1,
      requiredResearchIds: [],
      locked: true,
      costCoin: 0,
      costEmerald: 1,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[5].researches.map((research) => research.id)).toEqual([
      capacityResearchIds.cauldron(3),
    ]);
    expect(research.tabs[2].boxes[5].researches[0]).toMatchObject({
      id: capacityResearchIds.cauldron(3),
      label: 'cauldron 3 capacity',
      value: 'locked',
      effect: '+1 cauldron',
      showEffect: true,
      requiredPrestigeCount: 1,
      requiredResearchIds: [],
      locked: true,
      costCoin: 0,
      costEmerald: 1,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[6].researches.map((research) => research.id)).toEqual([
      advancedResearchIds.cauldronBrewing(1, 1),
    ]);
    expect(research.tabs[2].boxes[6].researches[0]).toMatchObject({
      id: advancedResearchIds.cauldronBrewing(1, 1),
      label: 'cauldron 1 brewing',
      starLevel: 1,
      value: '1 emerald',
      effect: '-5% time',
      showEffect: true,
      requiredResearchIds: [],
      costCoin: 0,
      costEmerald: 1,
      costCurrency: 'emerald',
    });
    expect(research.tabs[2].boxes[7].researches.map((research) => research.id)).toEqual([
      advancedResearchIds.plotGrowth(1, 1),
      advancedResearchIds.plotGrowth(2, 1),
    ]);
    expect(research.tabs[3].label).toBe('crystal research');
    expect(research.tabs[3].boxes.map((box) => box.id)).toEqual([
      'plotPlanting',
      'cauldronBrewing',
    ]);
    expect(research.tabs[3].boxes[0].researches[0]).toMatchObject({
      id: emeraldResearchIds.plotPlanting(1, 2),
      label: 'plot 1 lvl 2',
      value: '2 crystal',
      effect: 'x2 herbs',
      costCoin: 0,
      costCrystal: 2,
      costCurrency: 'crystal',
    });
    expect(research.tabs[3].boxes[0].researches[1]).toMatchObject({
      id: emeraldResearchIds.plotPlanting(2, 2),
      label: 'plot 2 lvl 2',
      value: '2 crystal',
      requiredResearchIds: [],
      costCrystal: 2,
      costCurrency: 'crystal',
    });
    expect(research.tabs[3].boxes[1].researches[0]).toMatchObject({
      id: emeraldResearchIds.cauldronBrewing(1, 2),
      label: 'cauldron 1',
      value: '2 crystal',
      effect: 'x2 potions',
      starLevel: 1,
      costCoin: 0,
      costCrystal: 2,
      costCurrency: 'crystal',
    });
    expect(research.boxes.map((box) => box.id)).toEqual([
      'seedUnlocks',
      'summonSeeds',
    ]);
    expect(research.boxes[0].researches).toHaveLength(24);
    expect(research.boxes[0].researches[0]).toEqual({
      id: 'unlockSeed:sageSeed',
      label: 'sage seed',
      value: 'researched',
      effect: 'drop',
      description: 'allows sage seed to drop from summon seed.',
      costCoin: 0,
      completed: true,
      canResearch: false,
    });
    expect(research.boxes[1].researches).toEqual([
      {
        id: 'summonSeedsX2',
        label: 'x2 summon',
        value: '600 coin',
        effect: '20 mana',
        description: 'summons 2 researched seeds for 20 mana.',
        costCoin: 600,
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
        costCoin: 1800,
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
        costCoin: 4500,
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
        costCoin: 10000,
        completed: false,
        locked: true,
        canResearch: false,
      },
    ]);
    advanceToLevel(gameplayFacade, 3);
    const levelThreeResearch = gameplayFacade.getSnapshot().research;
    expect(levelThreeResearch.boxes.map((box) => box.id)).toEqual([
      'seedUnlocks',
      'summonSeeds',
    ]);

    advanceToLevel(gameplayFacade, 4);
    const levelFourResearch = gameplayFacade.getSnapshot().research;
    expect(levelFourResearch.boxes.map((box) => box.id)).toEqual([
      'seedUnlocks',
      'summonSeeds',
      'recipeUnlocks',
    ]);
    expect(levelFourResearch.boxes[2].researches).toHaveLength(28);
    expect(levelFourResearch.boxes[2].researches[0]).toEqual({
      id: 'unlockRecipe:manaTonic',
      label: 'mana tonic',
      value: 'free',
      effect: 'brew',
      requiredPlayerLevel: 4,
      description: 'allows valid cauldron ingredients to brew mana tonic.',
      costCoin: 0,
      completed: false,
      canResearch: true,
    });

    advanceToLevel(gameplayFacade, 5);
    expect(gameplayFacade.getSnapshot().research.boxes[2].researches[0]).toMatchObject({
      id: 'unlockRecipe:manaTonic',
      value: 'free',
      requiredPlayerLevel: 4,
      costCoin: 0,
      completed: false,
      canResearch: true,
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
    ]);
    expect(getAutomationBoxResearchIds('autoBottleCauldrons')).toEqual([
      automationResearchIds.autoBottleCauldron(1),
      automationResearchIds.autoBottleCauldron(2),
    ]);
  });

  it('allows multiple timed researches to run concurrently', () => {
    const { gameplayFacade } = createGameplay({ instantResearch: false });

    gameplayFacade.emeraldFacade.setCurrent(20);

    expect(gameplayFacade.buyResearch(fastSellResearchIds.payout(1))).toMatchObject({
      ok: true,
      durationSeconds: 3,
    });
    expect(gameplayFacade.buyResearch(researchTimeResearchIds.reduction(1))).toMatchObject({
      ok: true,
      durationSeconds: 3,
    });
    expect(gameplayFacade.buyResearch(researchCostResearchIds.reduction(1))).toMatchObject({
      ok: true,
      durationSeconds: 3,
    });
    expect(gameplayFacade.getSnapshot().research.inProgressResearches).toHaveLength(3);
  }, 30_000);

  it('buys paid research with coin from research balance', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 6);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({ ok: true });
    gameplayFacade.coinFacade.add(40);

    expect(findResearchSnapshot(gameplayFacade, 'unlockSeed:nettleSeed')).toMatchObject({
      id: 'unlockSeed:nettleSeed',
      value: '40 coin',
      costCoin: 40,
      completed: false,
      canResearch: true,
    });

    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:nettleSeed',
      cost: 40,
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toContain(
      'unlockSeed:nettleSeed',
    );
    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toEqual({
      ok: false,
      reason: 'already_researched',
      researchId: 'unlockSeed:nettleSeed',
      cost: 40,
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

    advanceToLevel(gameplayFacade, 3);

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      durationSeconds: 60,
      remainingSeconds: 60,
      cost: 0,
    });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
    ]);
    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[1]).toMatchObject({
      id: 'unlockSeed:mintSeed',
      value: 'researching',
      inProgress: true,
      remainingMs: 60_000,
      totalMs: 60_000,
      canResearch: false,
    });
    expect(gameplayFacade.getSnapshot().logs.entries).toEqual([]);
    expect(researchAnnouncements).toEqual([]);

    ecsFacade.update({ timerDeltaSeconds: 59 });

    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[1]).toMatchObject({
      value: 'researching',
      inProgress: true,
      remainingMs: 1_000,
    });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
    ]);

    ecsFacade.update({ timerDeltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'unlockSeed:sageSeed',
      'unlockSeed:mintSeed',
    ]);
    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toEqual([
      'researched mint seed',
    ]);
    expect(researchAnnouncements).toEqual(['mint seed']);
  });

  it('creates a while-away report for saved-time catch-up results', () => {
    let nowMs = 0;
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      persistenceNow: () => nowMs,
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);
    makeResearchInstant(gameplayFacade, { 'unlockSeed:mintSeed': 60 });
    advanceToLevel(gameplayFacade, 4);
    openFirstNpcMarketStand(gameplayFacade);
    buyGardenTilesThrough(gameplayFacade, 2);
    gameplayFacade.itemsFacade.addItem(1, 7);

    expect(gameplayFacade.plantGardenSeed(1, 1)).toMatchObject({ ok: true });
    expect(gameplayFacade.plantGardenSeed(2, 1)).toMatchObject({ ok: true });
    expect(
      gameplayFacade.setSelectedShopShelfSlotSellItem(1, {
        sellLimitMode: 'amount',
        sellQuantityLimit: 5,
      }),
    ).toMatchObject({ ok: true });
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({
      ok: true,
      durationSeconds: 60,
    });

    gameplayFacade.rubyFacade.add(2);
    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toMatchObject({
      ok: true,
    });
    const manaCap = gameplayFacade.getSnapshot().mana.cap;
    expect(gameplayFacade.setSeedSummoningManaReserve(manaCap - 5)).toMatchObject({
      ok: true,
    });
    gameplayFacade.manaFacade.setCurrent(0);

    const save = gameplayFacade.createPersistenceSave();
    nowMs = 60_000;
    shopNowMs = 60_000;

    expect(gameplayFacade.loadPersistenceSave(save, ecsFacade)).toBe(true);

    const [report] = gameplayFacade.consumeWhileAwayReports();
    expect(report).toMatchObject({
      kind: 'whileAway',
      source: 'save_load',
      offlineSeconds: 60,
    });
    expect(report.rows).toEqual(
      [
        { type: 'npc_market_sold', coin: 5 },
      ],
    );
    expect(gameplayFacade.consumeWhileAwayReports()).toEqual([]);
    expect(gameplayFacade.getSnapshot().persistence.awayReportRevision).toBe(1);
  });

  it('buys automation research with ruby and auto summons seeds', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.coinFacade.add(100);

    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toEqual({
      ok: false,
      reason: 'not_enough_ruby',
      researchId: automationResearchIds.autoSeedSpawn(),
      cost: 2,
      costCurrency: 'ruby',
    });

    gameplayFacade.rubyFacade.add(2);

    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toEqual({
      ok: true,
      researchId: automationResearchIds.autoSeedSpawn(),
      cost: 2,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.getSnapshot().ruby.current).toBe(0);
    expect(gameplayFacade.getSnapshot().coin.current).toBe(100);

    ecsFacade.update({ deltaSeconds: 10 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(30);
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });
  });

  it('lets auto seed summoning be disabled and reserve mana', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.rubyFacade.add(2);

    expect(gameplayFacade.buyResearch(automationResearchIds.autoSeedSpawn())).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.setSeedSummoningAutoEnabled(false)).toEqual({
      ok: true,
      enabled: false,
    });

    ecsFacade.update({ deltaSeconds: 20 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(50);
    expect(gameplayFacade.itemsFacade.getItemQuantity(1)).toBe(0);

    expect(gameplayFacade.setSeedSummoningAutoEnabled(true)).toEqual({
      ok: true,
      enabled: true,
    });
    expect(gameplayFacade.setSeedSummoningManaReserve(15)).toEqual({
      ok: true,
      manaReserve: 15,
    });

    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(40);
    expect(gameplayFacade.itemsFacade.getItemQuantity(1)).toBe(1);

    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(31);
    expect(gameplayFacade.itemsFacade.getItemQuantity(1)).toBe(2);
  });

  it('buys advanced speed research with emerald and reveals the next level', () => {
    const { gameplayFacade } = createGameplay();
    const researchId = advancedResearchIds.cauldronBrewing(1, 1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: false,
      reason: 'not_enough_emerald',
      researchId,
      cost: 1,
      costCurrency: 'emerald',
    });

    gameplayFacade.emeraldFacade.add(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 1,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.getSnapshot().emerald.current).toBe(0);
    expect(
      gameplayFacade
        .getSnapshot()
        .research.tabs.find((tab) => tab.id === 'advanced')
        ?.boxes.find((box) => box.id === 'cauldronBrewing')
        ?.researches.map((research) => research.id),
    ).toEqual([advancedResearchIds.cauldronBrewing(1, 2)]);
  });

  it('buys emerald research time reduction and applies it to future research starts', () => {
    const { ecsFacade, gameplayFacade } = createGameplay({ instantResearch: false });
    const researchId = researchTimeResearchIds.reduction(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: false,
      reason: 'not_enough_emerald',
      researchId,
      cost: 1,
      costCurrency: 'emerald',
    });

    gameplayFacade.emeraldFacade.add(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      durationSeconds: 3,
      remainingSeconds: 3,
      cost: 1,
      costCurrency: 'emerald',
    });

    ecsFacade.update({ timerDeltaSeconds: 3 });

    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toContain(researchId);
    expect(gameplayFacade.researchFacade.getResearchTimeReductionPercent()).toBe(10);
    expect(
      gameplayFacade
        .getSnapshot()
        .research.tabs.find((tab) => tab.id === 'advanced')
        ?.boxes.find((box) => box.id === 'researchTime')
        ?.researches.map((research) => research.id),
    ).toEqual([researchTimeResearchIds.reduction(2)]);

    advanceToLevel(gameplayFacade, 3);

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      durationSeconds: 54,
      remainingSeconds: 54,
      cost: 0,
    });
  });

  it('buys emerald research cost reduction and applies it to future coin research costs', () => {
    const { gameplayFacade } = createGameplay();
    const researchId = researchCostResearchIds.reduction(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: false,
      reason: 'not_enough_emerald',
      researchId,
      cost: 1,
      costCurrency: 'emerald',
    });

    gameplayFacade.emeraldFacade.add(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 1,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.researchFacade.getResearchCostReductionPercent()).toBe(10);
    expect(
      gameplayFacade
        .getSnapshot()
        .research.tabs.find((tab) => tab.id === 'advanced')
        ?.boxes.find((box) => box.id === 'researchCost')
        ?.researches.map((research) => research.id),
    ).toEqual([researchCostResearchIds.reduction(2)]);

    advanceToLevel(gameplayFacade, 6);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({ ok: true });

    expect(findResearchSnapshot(gameplayFacade, 'unlockSeed:nettleSeed')).toMatchObject({
      value: '36 coin',
      costCoin: 36,
    });

    gameplayFacade.coinFacade.add(36);

    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:nettleSeed',
      cost: 36,
    });
  });

  it('uses crystal plot level-up to plant two seeds and harvest two herbs', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const researchId = emeraldResearchIds.plotPlanting(1, 2);
    const researchAnnouncements = [];

    gameplayFacade.setWorldChatFacade({
      announceResearch: (researchName) => {
        researchAnnouncements.push(researchName);
        return Promise.resolve({ ok: true, researchName });
      },
    });

    gameplayFacade.crystalFacade.spend(1);

    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: false,
      reason: 'not_enough_crystal',
      researchId,
      cost: 2,
      costCurrency: 'crystal',
    });

    gameplayFacade.crystalFacade.add(2);
    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 2,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toContain(researchId);
    expect(gameplayFacade.getSnapshot().logs.entries.map((entry) => entry.message)).toContain(
      'leveled up plot 1 lvl 2',
    );
    expect(researchAnnouncements).toEqual([]);
    expect(
      findResearchSnapshot(gameplayFacade, emeraldResearchIds.plotPlanting(1, 3)),
    ).toMatchObject({
      value: '4 crystal',
      costCrystal: 4,
      costCurrency: 'crystal',
      requiredResearchIds: [emeraldResearchIds.plotPlanting(1, 2)],
    });

    gameplayFacade.itemsFacade.addItem(1, 2);
    expect(gameplayFacade.plantGardenSeed(1, 1)).toMatchObject({
      ok: true,
      quantity: 2,
    });
    expect(gameplayFacade.itemsFacade.getItemQuantity(1)).toBe(0);

    ecsFacade.update({ deltaSeconds: 15 });
    expect(gameplayFacade.startGardenHarvest(1)).toMatchObject({
      ok: true,
      tileNumber: 1,
    });
    ecsFacade.update({ deltaSeconds: 3 });

    expect(gameplayFacade.itemsFacade.getItemQuantity(1001)).toBe(2);
  });

  it('uses crystal cauldron level-up to consume two recipe batches and bottle two potions', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const researchId = emeraldResearchIds.cauldronBrewing(1, 2);

    gameplayFacade.crystalFacade.add(2);
    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 2,
      costCurrency: 'crystal',
    });

    gameplayFacade.itemsFacade.addItem(1001, 6);
    gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 15 });

    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.addBrewingIngredient(1001).ok).toBe(true);
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      buttonLabel: 'brew mana tonic',
      manaCost: 24,
      yieldMultiplier: 2,
      canBrew: true,
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      manaCost: 24,
      quantity: 2,
      durationMs: 30_000,
    });
    expect(gameplayFacade.itemsFacade.getItemQuantity(1001)).toBe(0);

    ecsFacade.update({ deltaSeconds: 30 });
    expect(gameplayFacade.startBrewingBottling()).toMatchObject({
      ok: true,
      durationMs: 2_000,
    });
    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.itemsFacade.getItemQuantity(2001)).toBe(2);
  });

  it('lets upgraded cauldrons brew a selected smaller quantity', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const researchId = emeraldResearchIds.cauldronBrewing(1, 2);

    gameplayFacade.crystalFacade.add(2);
    expect(gameplayFacade.buyResearch(researchId)).toEqual({
      ok: true,
      researchId,
      cost: 2,
      costCurrency: 'crystal',
    });
    expect(gameplayFacade.setBrewingBrewQuantity(1)).toMatchObject({
      ok: true,
      brewQuantity: 1,
      maxBrewQuantity: 2,
    });

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 15 });

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic')).toMatchObject({
      ok: true,
      brewQuantity: 1,
      ingredientItemTypeIds: [1001, 1001, 1001],
      requiredIngredientItemTypeIds: [1001, 1001, 1001],
    });
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      level: 2,
      maxBrewQuantity: 2,
      brewQuantity: 1,
      manaCost: 12,
      yieldMultiplier: 1,
      canBrew: true,
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      manaCost: 12,
      quantity: 1,
      durationMs: 30_000,
    });
    expect(gameplayFacade.itemsFacade.getItemQuantity(1001)).toBe(0);

    ecsFacade.update({ deltaSeconds: 30 });
    expect(gameplayFacade.startBrewingBottling()).toMatchObject({
      ok: true,
      durationMs: 2_000,
    });
    ecsFacade.update({ deltaSeconds: 2 });

    expect(gameplayFacade.itemsFacade.getItemQuantity(2001)).toBe(1);
  });

  it('force-flushes a cauldron batch choice so it survives an immediate reload', () => {
    const { gameplayFacade } = createGameplay();
    const storageManager = {
      canSave: vi.fn(() => true),
      save: vi.fn(() => true),
      saveAndFlush: vi.fn(() => true),
    };

    gameplayFacade.setPersistenceStorage(storageManager);
    gameplayFacade.setBrewingBrewQuantity(1);

    expect(storageManager.save).not.toHaveBeenCalled();
    expect(storageManager.saveAndFlush).toHaveBeenCalledTimes(1);
  });

  it('starts fast sell at 80% payout and raises it with emerald research', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);

    expect(gameplayFacade.quoteNpcMarketSell(1, 1)).toMatchObject({
      ok: true,
      priceCoin: 1,
      totalPriceCoin: 1,
      fastSellPercent: 80,
    });

    gameplayFacade.emeraldFacade.add(17);
    expect(gameplayFacade.buyResearch(fastSellResearchIds.payout(1))).toMatchObject({
      ok: true,
      cost: 2,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.buyResearch(fastSellResearchIds.payout(2))).toMatchObject({
      ok: true,
      cost: 5,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.buyResearch(fastSellResearchIds.payout(3))).toMatchObject({
      ok: true,
      cost: 10,
      costCurrency: 'emerald',
    });

    expect(gameplayFacade.quoteNpcMarketSell(1, 1)).toMatchObject({
      ok: true,
      priceCoin: 1,
      totalPriceCoin: 1,
      fastSellPercent: 95,
    });
  });

  it('keeps NPC demand and prices fake until player reaches level 4', async () => {
    const { gameplayFacade } = createGameplay();
    const backendSells = [];
    gameplayFacade.setNpcMarketFacade({
      getNpcBuyPriceCoin: () => 7,
      getNpcNeed: () => 12,
      sellToNpc({ itemKey, quantity }) {
        backendSells.push({ itemKey, quantity });
        return Promise.resolve({ ok: true });
      },
    });

    gameplayFacade.itemsFacade.addItem(1, 2);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems.find(
      (item) => item.key === 'sageSeed',
    )).toMatchObject({
      sellCoin: 1,
      fastSellCoin: 1,
      sellNeed: 1000,
    });
    await expect(gameplayFacade.sellNpcMarketItem(1, 2)).resolves.toMatchObject({
      ok: true,
      priceCoin: 1,
      totalPriceCoin: 2,
    });
    expect(backendSells).toEqual([]);

    advanceToLevel(gameplayFacade, 4);
    gameplayFacade.itemsFacade.addItem(1, 2);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems.find(
      (item) => item.key === 'sageSeed',
    )).toMatchObject({
      sellCoin: 7,
      fastSellCoin: 6,
      sellNeed: 12,
    });
    await expect(gameplayFacade.sellNpcMarketItem(1, 2)).resolves.toMatchObject({
      ok: true,
      priceCoin: 6,
      totalPriceCoin: 12,
    });
    expect(backendSells).toEqual([{ itemKey: 'sageSeed', quantity: 2 }]);
  });

  it('keeps market subscriptions stable while gameplay snapshots are read', () => {
    const { gameplayFacade } = createGameplay();
    const setNpcMarketId = vi.fn();
    const setPlayerMarketId = vi.fn();

    gameplayFacade.setNpcMarketFacade({
      getNpcBuyPriceCoin: () => 1,
      getNpcNeed: () => 1000,
      setActiveMarketId: setNpcMarketId,
    });
    gameplayFacade.setPlayerShopFacade({
      setActiveMarketId: setPlayerMarketId,
    });

    const npcCallsAfterSetup = setNpcMarketId.mock.calls.length;
    const playerCallsAfterSetup = setPlayerMarketId.mock.calls.length;

    gameplayFacade.getSnapshot();
    gameplayFacade.getSnapshot();
    gameplayFacade.getSnapshot();

    expect(setNpcMarketId).toHaveBeenCalledTimes(npcCallsAfterSetup);
    expect(setPlayerMarketId).toHaveBeenCalledTimes(playerCallsAfterSetup);
  });

  it('publishes NPC quotes once after a subscription update burst', async () => {
    const { gameplayFacade } = createGameplay();
    advanceToLevel(gameplayFacade, 4);
    gameplayFacade.itemsFacade.addItem(1, 1);

    let price = null;
    let listener = null;
    gameplayFacade.setNpcMarketFacade({
      getPrice: () => price,
      getNpcBuyPriceCoin: () => price?.npcBuyPriceCoin ?? null,
      getNpcNeed: () => price?.npcNeed ?? null,
      getNpcSellPriceCoin: () => price?.npcSellPriceCoin ?? null,
      getNpcStock: () => price?.npcStock ?? null,
      subscribe(callback) {
        listener = callback;
        return () => {
          listener = null;
        };
      },
    });
    const publishedSnapshots = [];
    const unsubscribe = gameplayFacade.subscribe((snapshot) => {
      publishedSnapshots.push(snapshot);
    });

    price = {
      basePriceCoin: 1,
      marketPriceCoin: 3,
      npcBuyPriceCoin: 2,
      npcSellPriceCoin: 4,
      npcNeed: 12,
      targetNeed: 20,
      targetStock: 20,
      npcStock: 9,
    };
    listener({ connected: true, prices: [price] });
    listener({ connected: true, prices: [price] });
    await Promise.resolve();

    expect(publishedSnapshots).toHaveLength(1);
    const sageSeed = publishedSnapshots[0].shop.stock.items.find(
      (item) => item.key === 'sageSeed',
    );

    expect(sageSeed).toMatchObject({
      sellNeed: 12,
      stock: 9,
    });
    expect(sageSeed.buyCoin).toBeGreaterThan(0);
    expect(sageSeed.sellCoin).toBeGreaterThan(0);
    unsubscribe();
  });

  it('advanced speed research lowers plot growth and cauldron brewing timers', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.emeraldFacade.add(2);
    expect(gameplayFacade.buyResearch(advancedResearchIds.plotGrowth(1, 1))).toMatchObject({
      ok: true,
      costCurrency: 'emerald',
    });
    expect(gameplayFacade.buyResearch(advancedResearchIds.cauldronBrewing(1, 1))).toMatchObject({
      ok: true,
      costCurrency: 'emerald',
    });

    gameplayFacade.itemsFacade.addItem(1, 1);
    expect(gameplayFacade.plantGardenSeed(1, 1)).toMatchObject({
      ok: true,
      durationMs: 11_400,
    });

    ecsFacade.update({ deltaSeconds: 12 });
    gameplayFacade.coinFacade.add(80);
    gameplayFacade.itemsFacade.addItem(1001, 3);
    expect(unlockRecipeResearch(gameplayFacade)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      durationMs: 28_500,
    });
  });

  it('reserves mana for pending auto brew before auto summoning seeds', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    unlockSageSeed(gameplayFacade);
    gameplayFacade.coinFacade.add(80);
    gameplayFacade.rubyFacade.add(3);
    gameplayFacade.itemsFacade.addItem(1001, 3);

    expect(unlockRecipeResearch(gameplayFacade)).toMatchObject({
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
      autoBrewArmed: false,
    });

    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();

    gameplayFacade.manaFacade.fill();
    gameplayFacade.itemsFacade.addItem(1001, 3);
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.addBrewingIngredient(1001)).toMatchObject({ ok: true });
    expect(gameplayFacade.brewCauldron()).toMatchObject({ ok: true });
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      autoBrewEnabled: true,
      autoBrewArmed: true,
    });
    expect(gameplayFacade.brewingFacade.getPendingAutoBrewManaCost()).toBe(12);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'brewing',
      remainingMs: 30_000,
    });
    ecsFacade.update({ deltaSeconds: 3 });

    expect(gameplayFacade.getSnapshot().mana.current).toBeGreaterThanOrEqual(12);
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'brewing',
      remainingMs: 27_000,
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

    advanceToLevel(gameplayFacade, 3);

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      cost: 0,
    });
    expect(researchAnnouncements).toEqual(['mint seed']);

    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: false,
      reason: 'already_researched',
      researchId: 'unlockSeed:mintSeed',
      cost: 0,
    });
    expect(researchAnnouncements).toEqual(['mint seed']);
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

    gameplayFacade.coinFacade.add(150);

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

    gameplayFacade.coinFacade.add(20);

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

    advanceToLevel(gameplayFacade, 3);
    gameplayFacade.coinFacade.add(10000);

    expect(getResearch('unlockSeed:mintSeed')).toMatchObject({
      value: 'free',
      canResearch: true,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      cost: 0,
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
      cost: 1800,
    });

    expect(gameplayFacade.buyResearch('summonSeedsX2')).toEqual({
      ok: true,
      researchId: 'summonSeedsX2',
      cost: 600,
    });
    expect(getResearch('summonSeedsX3')).toMatchObject({
      value: '1800 coin',
      canResearch: true,
    });
    expect(gameplayFacade.buyResearch('summonSeedsX4')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'summonSeedsX4',
      requiredResearchId: 'summonSeedsX3',
      cost: 4500,
    });

    advanceToLevel(gameplayFacade, 5);

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
      cost: 60,
    });

    expect(gameplayFacade.buyResearch('unlockRecipe:manaTonic')).toEqual({
      ok: true,
      researchId: 'unlockRecipe:manaTonic',
      cost: 0,
    });
    advanceToLevel(gameplayFacade, 6);
    expect(getResearch('unlockRecipe:minorHealingPotion')).toMatchObject({
      value: '60 coin',
      canResearch: true,
    });

    expect(getResearch('unlockRecipe:briarWard')).toMatchObject({
      requiredResearchIds: ['unlockRecipe:calmingDraught'],
      value: 'locked',
      locked: true,
    });
    expect(getResearch('unlockRecipe:simpleAntidote')).toMatchObject({
      requiredResearchIds: ['unlockRecipe:lanternTonic'],
      value: 'locked',
      locked: true,
    });
    expect(getResearch('unlockRecipe:dragonCourage')).toMatchObject({
      requiredResearchIds: ['unlockRecipe:pactWard'],
      value: 'locked',
      locked: true,
    });
  });

  it('keeps nettle seed research available during level 6 requirements', () => {
    const { gameplayFacade } = createGameplay();
    const getResearch = (researchId) =>
      gameplayFacade
        .getSnapshot()
        .research.boxes.flatMap((box) => box.researches)
        .find((research) => research.id === researchId);
    const finishCurrentTasksWithoutCoin = () => {
      for (const task of gameplayFacade.getSnapshot().tasks.level.tasks) {
        finishTaskRequirement(gameplayFacade, task);
      }
    };

    advanceToLevel(gameplayFacade, 3);
    gameplayFacade.coinFacade.add(115);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({
      ok: true,
      cost: 0,
    });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(115);
    expect(getResearch('unlockSeed:nettleSeed')).toMatchObject({
      value: 'locked',
      requiredPlayerLevel: 5,
      locked: true,
      canResearch: false,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toEqual({
      ok: false,
      reason: 'missing_required_level',
      researchId: 'unlockSeed:nettleSeed',
      requiredPlayerLevel: 5,
      cost: 40,
    });

    while (gameplayFacade.getSnapshot().tasks.currentLevel < 5) {
      finishCurrentTasksWithoutCoin();
      gameplayFacade.coinFacade.add(gameplayFacade.getSnapshot().tasks.level.completion.costCoin);
      expect(gameplayFacade.completeTaskLevel()).toMatchObject({ ok: true });
    }

    expect(getResearch('unlockSeed:nettleSeed')).toMatchObject({
      value: '40 coin',
      canResearch: true,
    });
    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toMatchObject({
      ok: true,
      researchId: 'unlockSeed:nettleSeed',
      cost: 40,
    });
  });

  it('lets level 2 players research mint seed for the level 3 requirements', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 2);

    expect(findResearchSnapshot(gameplayFacade, 'unlockSeed:mintSeed')).toMatchObject({
      value: 'free',
      requiredPlayerLevel: 2,
      canResearch: true,
    });
    expect(findResearchSnapshot(gameplayFacade, 'unlockSeed:mintSeed')).not.toHaveProperty(
      'locked',
    );
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toEqual({
      ok: true,
      researchId: 'unlockSeed:mintSeed',
      cost: 0,
    });
  });

  it('rejects legacy mana research ids', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.coinFacade.add(75);

    expect(gameplayFacade.buyResearch('manaProductionRate')).toEqual({
      ok: false,
      reason: 'unknown_research',
      researchId: 'manaProductionRate',
    });
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBe(1);
  });

  it('rejects research purchase without enough coin', () => {
    const { gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 6);
    expect(gameplayFacade.buyResearch('unlockSeed:mintSeed')).toMatchObject({ ok: true });

    expect(gameplayFacade.buyResearch('unlockSeed:nettleSeed')).toEqual({
      ok: false,
      reason: 'not_enough_coin',
      researchId: 'unlockSeed:nettleSeed',
      cost: 40,
    });
  });

  it('brews an unlocked matching recipe after herbs are added in order', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(gameplayFacade);
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
    expect(gameplayFacade.getSnapshot().mana.current).toBe(78);
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
    gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(gameplayFacade);

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

  it('uses bought cauldrons as independent brewing slots', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 5);
    gameplayFacade.syncPlayerLevelManaEffects();
    gameplayFacade.manaFacade.fill();
    gameplayFacade.itemsFacade.addItem(1001, 6);
    gameplayFacade.coinFacade.add(180);
    unlockRecipeResearch(gameplayFacade);
    gameplayFacade.coinFacade.add(100);

    expect(gameplayFacade.getSnapshot().brewing.maxCauldrons).toBe(2);
    expect(gameplayFacade.getSnapshot().brewing.cauldrons).toHaveLength(1);
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      unlockedCauldrons: 1,
      nextCauldronNumber: 2,
      nextCauldronCost: 25,
      nextCauldronLockedByLevel: false,
    });
    expect(gameplayFacade.prepareBrewingRecipe('manaTonic', 1)).toMatchObject({
      ok: false,
      reason: 'cauldron_locked',
      cauldronNumber: 2,
    });
    expect(gameplayFacade.buyBrewingCauldron()).toMatchObject({
      ok: true,
      cost: 25,
      cauldronNumber: 2,
    });
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      unlockedCauldrons: 2,
      nextCauldronNumber: 3,
      nextCauldronLockedByResearch: true,
      nextCauldronRequiresResearchId: capacityResearchIds.cauldron(3),
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons).toHaveLength(2);

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
  }, 10_000);

  it('keeps auto brew recipes scoped to each cauldron', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    advanceToLevel(gameplayFacade, 5);
    gameplayFacade.syncPlayerLevelManaEffects();
    gameplayFacade.manaFacade.fill();
    gameplayFacade.coinFacade.add(500);
    gameplayFacade.rubyFacade.add(3);
    gameplayFacade.itemsFacade.addItem(1001, 5);
    gameplayFacade.itemsFacade.addItem(1002, 1);
    unlockRecipeResearch(gameplayFacade);
    unlockRecipeResearch(gameplayFacade, 'unlockRecipe:minorHealingPotion');
    gameplayFacade.coinFacade.add(500);
    expect(gameplayFacade.buyBrewingCauldron()).toMatchObject({
      ok: true,
      cauldronNumber: 2,
    });

    expect(gameplayFacade.buyResearch(automationResearchIds.autoBrewCauldron(1))).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBrewCauldron(2))).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe('manaTonic', 0)).toMatchObject({
      ok: true,
      autoBrewRecipeKey: 'manaTonic',
      cauldronNumber: 1,
    });
    expect(gameplayFacade.setBrewingAutoBrewEnabled(true, 0)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
      cauldronNumber: 1,
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe('minorHealingPotion', 1)).toMatchObject({
      ok: true,
      autoBrewRecipeKey: 'minorHealingPotion',
      cauldronNumber: 2,
    });
    expect(gameplayFacade.setBrewingAutoBrewEnabled(true, 1)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
      cauldronNumber: 2,
    });

    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1]).toMatchObject({
      autoBrewEnabled: true,
      autoBrewArmed: false,
      autoBrewRecipeKey: 'minorHealingPotion',
    });

    ecsFacade.update({ deltaSeconds: 0 });

    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0].activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].activeBrew).toBeNull();

    expect(gameplayFacade.prepareBrewingRecipe('manaTonic', 0)).toMatchObject({ ok: true });
    expect(gameplayFacade.brewCauldron(0)).toMatchObject({ ok: true });
    expect(gameplayFacade.prepareBrewingRecipe('minorHealingPotion', 1)).toMatchObject({
      ok: true,
    });
    expect(gameplayFacade.brewCauldron(1)).toMatchObject({ ok: true });

    expect(gameplayFacade.getSnapshot().brewing.cauldrons[0].activeBrew).toMatchObject({
      key: 'manaTonic',
      cauldronNumber: 1,
    });
    expect(gameplayFacade.getSnapshot().brewing.cauldrons[1].activeBrew).toMatchObject({
      key: 'minorHealingPotion',
      cauldronNumber: 2,
    });
  }, 10_000);

  it('persists independent cauldron state and potion inventory across restart', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    advanceToLevel(first.gameplayFacade, 5);
    first.gameplayFacade.syncPlayerLevelManaEffects();
    first.gameplayFacade.itemsFacade.addItem(1001, 6);
    first.gameplayFacade.itemsFacade.addItem(2001, 2);
    first.gameplayFacade.coinFacade.add(180);
    unlockRecipeResearch(first.gameplayFacade);
    first.gameplayFacade.coinFacade.add(100);
    expect(first.gameplayFacade.buyBrewingCauldron()).toMatchObject({
      ok: true,
      cauldronNumber: 2,
    });
    first.gameplayFacade.crystalFacade.add(24);
    for (const cauldronNumber of [1, 2]) {
      for (const multiplier of [2, 3, 4]) {
        expect(
          first.gameplayFacade.buyResearch(
            emeraldResearchIds.cauldronBrewing(cauldronNumber, multiplier),
          ),
        ).toMatchObject({ ok: true });
      }
    }
    expect(first.gameplayFacade.setBrewingBrewQuantity(1, 0)).toMatchObject({
      ok: true,
      brewQuantity: 1,
      maxBrewQuantity: 4,
    });
    expect(first.gameplayFacade.setBrewingBrewQuantity(1, 1)).toMatchObject({
      ok: true,
      brewQuantity: 1,
      maxBrewQuantity: 4,
    });

    expect(first.gameplayFacade.prepareBrewingRecipe('manaTonic', 1)).toMatchObject({
      ok: true,
      cauldronNumber: 2,
    });
    expect(first.gameplayFacade.setBrewingAutoBrewRecipe('manaTonic', 0)).toMatchObject({
      ok: true,
    });
    expect(first.gameplayFacade.setBrewingAutoBrewEnabled(true, 0)).toMatchObject({
      ok: true,
      autoBrewArmed: false,
    });
    first.gameplayFacade.brewingFacade.armAutoBrew(0);
    expect(first.gameplayFacade.setBrewingAutoBrewRecipe('manaTonic', 1)).toMatchObject({
      ok: true,
    });
    expect(first.gameplayFacade.setBrewingAutoBrewEnabled(true, 1)).toMatchObject({
      ok: true,
      autoBrewArmed: false,
    });
    first.gameplayFacade.savePersistenceSnapshot();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.brewing.unlockedCauldrons).toBe(2);
    expect(snapshot.brewing.cauldrons).toHaveLength(2);
    expect(snapshot.brewing.cauldrons[1].ingredients).toHaveLength(3);
    expect(snapshot.brewing.cauldrons[0]).toMatchObject({
      brewQuantity: 1,
      maxBrewQuantity: 4,
      autoBrewEnabled: true,
      autoBrewArmed: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(snapshot.brewing.cauldrons[1]).toMatchObject({
      brewQuantity: 1,
      maxBrewQuantity: 4,
      autoBrewEnabled: true,
      autoBrewArmed: false,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(snapshot.inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 2,
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

    gameplayFacade.coinFacade.add(80);
    gameplayFacade.rubyFacade.add(2);
    unlockRecipeResearch(gameplayFacade);
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBrewCauldron(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoBottleCauldron(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.setBrewingAutoBrewRecipe('manaTonic')).toMatchObject({
      ok: true,
      autoBrewRecipeKey: 'manaTonic',
    });
    expect(gameplayFacade.setBrewingAutoBrewEnabled(true)).toMatchObject({
      ok: true,
      autoBrewEnabled: true,
      autoBrewArmed: false,
    });
    gameplayFacade.itemsFacade.addItem(1001, 6);
    ecsFacade.update({ deltaSeconds: 12 });
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    expect(gameplayFacade.brewCauldron()).toMatchObject({ ok: true });

    expect(gameplayFacade.getSnapshot().mana.current).toBe(78);
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toEqual([]);
    expect(gameplayFacade.getSnapshot().brewing).toMatchObject({
      autoBrewEnabled: true,
      autoBrewArmed: true,
    });
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

    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'mana tonic',
      kind: 'potion',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toMatchObject({
      key: 'manaTonic',
      phase: 'brewing',
      remainingMs: 30_000,
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
    expect(gameplayFacade.getSnapshot().mana.current).toBe(42);
    expect(gameplayFacade.getSnapshot().brewing.ingredients).toHaveLength(3);
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'sage',
      kind: 'herb',
      quantity: 3,
    });
  });

  it('uses ingredient order and turns unknown mixes into wasted potion worth one coin', () => {
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

    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'wasted potion',
        kind: 'potion',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems).toContainEqual(expect.objectContaining({
      itemTypeId: 2029,
      key: 'wastedPotion',
      label: 'wasted potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
      quantity: 1,
      sellCoin: null,
      fastSellCoin: 0,
      fastSellPercent: 80,
      sellNeed: null,
      buyCoin: null,
      stock: null,
      marketGrade: 4,
      tradedHere: false,
    }));
  });

  it('grants market stalls from the permanent market licence', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().shop.shelf).toMatchObject({
      unlockedSlots: 1,
      maxSlots: 1,
      slotCosts: [],
      nextSlotNumber: null,
      nextSlotCost: null,
      selectedSlotNumber: 1,
    });

    gameplayFacade.prestigeFacade.applyPersistenceSnapshot({ completedLevels: [10] });

    expect(gameplayFacade.getSnapshot().shop).toMatchObject({
      market: { id: 'crossroads', rank: 2 },
      shelf: {
        unlockedSlots: 2,
        maxSlots: 2,
        selectedSlotNumber: 1,
      },
      playerShelf: {
        unlockedSlots: 2,
        maxSlots: 2,
        selectedSlotNumber: 1,
      },
    });
  });

  it('buys garden tiles with costs from garden balance', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.getSnapshot().garden.plot).toMatchObject({
      unlockedTiles: 1,
      maxTiles: 12,
      maxUnlockedTilesByLevel: 2,
      maxUnlockedTilesByProgression: 2,
      tilesPerRow: 4,
      tileCosts: [
        0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800, 7000, 10000,
      ],
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: false,
      nextTileLockedByResearch: false,
      nextTileRequiresLevel: null,
      nextTileRequiresResearchId: null,
      harvestSeconds: 3,
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
      reason: 'not_enough_coin',
      cost: 25,
      tileNumber: 2,
    });

    gameplayFacade.coinFacade.add(25);

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
    gameplayFacade.coinFacade.add(75);

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
      durationMs: 12_000,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      tileNumber: 1,
      unlocked: true,
      phase: 'growing',
      selectedSeedKey: 'sageSeed',
      selectedHerbKey: 'sageHerb',
      selectedHerbLabel: 'sage',
      seedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 12_000,
      totalMs: 12_000,
      process: {
        phase: 'growing',
        totalMs: 12_000,
        remainingMs: 12_000,
        progress: 0,
      },
    });

    ecsFacade.update({ deltaSeconds: 11 });

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
      durationMs: 3_000,
    });

    ecsFacade.update({ deltaSeconds: 2 });

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
      selectedHerbKey: 'sageHerb',
      selectedHerbLabel: 'sage',
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

  it('saves timer-driven personal task completions before the next autosave window', () => {
    const persistenceStorage = createMemoryStorage();
    const { ecsFacade, gameplayFacade } = createGameplay({ persistenceStorage });

    advanceToLevel(gameplayFacade, 4);
    const harvestTask = gameplayFacade
      .getSnapshot()
      .personalTasks.daily.tasks.find((task) => task.taskKey === 'harvest');
    gameplayFacade.recordPersonalTaskAction(
      harvestTask.actionType,
      harvestTask.requiredQuantity - 1,
    );
    gameplayFacade.publishAndSaveSnapshot();

    gameplayFacade.itemsFacade.addItem(1, 1);
    expect(gameplayFacade.plantGardenSeed(1, 1)).toMatchObject({ ok: true });
    ecsFacade.update({ deltaSeconds: 60, timerDeltaSeconds: 60 });
    expect(gameplayFacade.startGardenHarvest(1)).toMatchObject({ ok: true });
    expect(getSavedPersonalTask(persistenceStorage, 'harvest')).toMatchObject({
      progressQuantity: harvestTask.requiredQuantity - 1,
      completed: false,
    });
    expect(getSavedPersonalTasks(persistenceStorage)?.periods?.weekly).toMatchObject({
      currentPoints: 0,
    });

    ecsFacade.update({ deltaSeconds: 3, timerDeltaSeconds: 3 });
    gameplayFacade.afterUpdate({ deltaSeconds: 3, timerDeltaSeconds: 3 });

    expect(
      gameplayFacade
        .getSnapshot()
        .personalTasks.daily.tasks.find((task) => task.taskKey === 'harvest'),
    ).toMatchObject({
      progressQuantity: harvestTask.requiredQuantity,
      completed: true,
    });
    expect(getSavedPersonalTask(persistenceStorage, 'harvest')).toMatchObject({
      progressQuantity: harvestTask.requiredQuantity,
      completed: true,
    });
    expect(getSavedPersonalTasks(persistenceStorage)?.periods?.weekly).toMatchObject({
      currentPoints: harvestTask.pointValue,
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
      selectedHerbKey: 'sageHerb',
      selectedHerbLabel: 'sage',
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

  it('replaces a growing garden seed, returns the old seed, and resets progress', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.itemsFacade.addItem(2, 1);
    gameplayFacade.plantGardenSeed(1, 1);
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      seedKey: 'sageSeed',
      remainingMs: 7_000,
    });

    expect(gameplayFacade.replaceGardenSeed(1, 2)).toEqual({
      ok: true,
      tileNumber: 1,
      seed: {
        itemTypeId: 2,
        key: 'mintSeed',
        label: 'mint seed',
        kind: 'seed',
      },
      herb: {
        itemTypeId: 1002,
        key: 'mintHerb',
        label: 'mint',
        kind: 'herb',
      },
      replacedSeed: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      durationMs: 25_000,
      replaced: true,
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      selectedSeedKey: 'mintSeed',
      seedKey: 'mintSeed',
      herbKey: 'mintHerb',
      remainingMs: 25_000,
      totalMs: 25_000,
      process: {
        phase: 'growing',
        remainingMs: 25_000,
        progress: 0,
      },
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'sage seed',
      kind: 'seed',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 2,
      key: 'mintSeed',
      label: 'mint seed',
      kind: 'seed',
      quantity: 0,
    });
  });

  it('auto harvests ready plants and auto replants selected tiles after research', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);
    gameplayFacade.coinFacade.add(25);
    gameplayFacade.rubyFacade.add(2);
    expect(gameplayFacade.buyGardenTile()).toMatchObject({
      ok: true,
      tileNumber: 2,
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoPlantTile(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'ruby',
    });
    expect(gameplayFacade.buyResearch(automationResearchIds.autoHarvestPlant(1))).toMatchObject({
      ok: true,
      cost: 1,
      costCurrency: 'ruby',
    });
    gameplayFacade.itemsFacade.addItem(1, 4);
    gameplayFacade.plantGardenSeed(1, 1);
    gameplayFacade.plantGardenSeed(2, 1);

    ecsFacade.update({ deltaSeconds: 20 });

    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'harvesting',
      selectedSeedKey: 'sageSeed',
      herbKey: 'sageHerb',
      remainingMs: 3_000,
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
      remainingMs: 12_000,
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
      remainingMs: 7_000,
      totalMs: 12_000,
    });

    second.ecsFacade.update({ deltaSeconds: 7 });

    expect(second.gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'ready',
      process: null,
    });
  });

  it('keeps higher-grade goods visible but unavailable in the starting market', () => {
    const { gameplayFacade } = createGameplay();
    const pearlroot = gameplayFacade
      .getSnapshot()
      .shop.shelf.sellItems.find((item) => item.key === 'pearlrootDraught');

    expect(pearlroot).toMatchObject({
      marketGrade: 5,
      tradedHere: false,
      sellCoin: null,
      requiredMarket: { id: 'arcaneExchange' },
    });
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
      match: {
        key: null,
        label: 'unknown potion',
        realLabel: 'ashen memory',
        unlocked: false,
        discoverable: true,
        unknown: true,
        discoveryType: 'unknown',
      },
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
    expect(gameplayFacade.getSnapshot().mana.current).toBe(45);

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
    expect(
      gameplayFacade
        .getSnapshot()
        .brewing.recipes.find((recipe) => recipe.key === 'ashenMemory'),
    ).toMatchObject({
      discovered: true,
      discoveredByUsername: 'Ada',
      unlocked: true,
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

    expect(initialSellItems).toHaveLength(87);
    expect(initialSellItems.find((item) => item.key === 'sageSeed')).toMatchObject({
      quantity: 0,
      sellCoin: 1,
    });
    expect(initialSellItems.find((item) => item.key === 'manaTonic')).toMatchObject({
      quantity: 0,
      sellCoin: 55,
    });
    expect(initialSellItems.find((item) => item.key === 'pearlrootDraught')).toMatchObject({
      quantity: 0,
      sellCoin: null,
      marketGrade: 5,
      tradedHere: false,
    });

    gameplayFacade.coinFacade.add(80);
    unlockRecipeResearch(gameplayFacade);
    gameplayFacade.itemsFacade.addItem(2, 2);

    const sellItems = gameplayFacade.getSnapshot().shop.shelf.sellItems;

    expect(sellItems).toHaveLength(87);
    expect(sellItems.find((item) => item.key === 'mintSeed')).toMatchObject({
      quantity: 2,
      sellCoin: 1,
    });
    expect(sellItems.find((item) => item.key === 'sageHerb')).toMatchObject({
      quantity: 0,
      sellCoin: 6,
    });
    expect(sellItems.find((item) => item.key === 'nettleSeed')).toMatchObject({
      quantity: 0,
      sellCoin: 1,
    });
  });

  it('auto sells selected NPC market item over time', () => {
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);
    openFirstNpcMarketStand(gameplayFacade);

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    gameplayFacade.itemsFacade.addItem(summonResult.seed.id, 10);
    gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id);

    shopNowMs = 4_000;
    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
    expect(gameplayFacade.getSnapshot().inventory).toHaveLength(1);

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(11);
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

  it('auto sells only a fixed marked NPC market amount', () => {
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);
    openFirstNpcMarketStand(gameplayFacade);

    unlockSageSeed(gameplayFacade);
    ecsFacade.update({ deltaSeconds: 10 });
    const summonResult = gameplayFacade.summonSeed();
    gameplayFacade.itemsFacade.addItem(summonResult.seed.id, 10);
    expect(
      gameplayFacade.setSelectedShopShelfSlotSellItem(summonResult.seed.id, {
        sellLimitMode: 'amount',
        sellQuantityLimit: 7,
      }),
    ).toMatchObject({
      ok: true,
      sellLimitMode: 'amount',
      sellQuantityLimit: 7,
    });

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(7);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: summonResult.seed.id,
        key: summonResult.seed.key,
        label: summonResult.seed.label,
        kind: 'seed',
        quantity: 4,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      sellItemTypeId: summonResult.seed.id,
      sellLimitMode: 'amount',
      sellQuantityLimit: 0,
      sellQuantity: 4,
    });

    shopNowMs = 10_000;
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(7);
    expect(gameplayFacade.getSnapshot().inventory[0].quantity).toBe(4);
  });

  it('uses one NPC market timer for the whole shop', () => {
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);

    openFirstNpcMarketStand(gameplayFacade);
    gameplayFacade.prestigeFacade.applyPersistenceSnapshot({ completedLevels: [10] });
    expect(gameplayFacade.getSnapshot().shop.shelf.unlockedSlots).toBe(2);

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.itemsFacade.addItem(2, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1);

    shopNowMs = 4_000;
    ecsFacade.update({ deltaSeconds: 4 });

    expect(gameplayFacade.getSnapshot().shop.shelf.sellProgressSeconds).toBe(4);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0].sellProgressSeconds).toBe(4);

    gameplayFacade.selectShopShelfSlot(2);
    gameplayFacade.setSelectedShopShelfSlotSellItem(2);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellProgressSeconds).toBe(4);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0].sellProgressSeconds).toBe(4);
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[1].sellProgressSeconds).toBe(4);

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(2);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([]);
    expect(gameplayFacade.getSnapshot().shop.shelf.sellProgressSeconds).toBe(0);
  });

  it('collects the crystal-tab coin offer and cools it down', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    expect(gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      rewardCoin: 20,
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });

    expect(gameplayFacade.collectShopCoinOffer()).toEqual({
      ok: true,
      coin: 20,
      cooldownSeconds: 7_200,
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(20);
    expect(rewardEvents).toEqual([
      expect.objectContaining({
        type: 'coin_collected',
        coin: 20,
        source: 'shop_coin_offer',
      }),
    ]);
    expect(gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      cooldownRemainingSeconds: 7_200,
      canCollect: false,
    });
    expect(gameplayFacade.collectShopCoinOffer()).toMatchObject({
      ok: false,
      reason: 'cooldown',
    });
    expect(rewardEvents).toHaveLength(1);

    ecsFacade.update({ timerDeltaSeconds: 7_199 });
    expect(gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      cooldownRemainingSeconds: 1,
      canCollect: false,
    });

    finishCurrentTaskLevel(gameplayFacade);
    ecsFacade.update({ timerDeltaSeconds: 1 });
    expect(gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      rewardCoin: 40,
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });
    expect(gameplayFacade.collectShopCoinOffer()).toMatchObject({
      ok: true,
      coin: 40,
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(60);
    expect(rewardEvents[1]).toMatchObject({
      type: 'coin_collected',
      coin: 40,
      source: 'shop_coin_offer',
    });
    unsubscribeRewardEvents();
  });

  it('publishes player shop proceeds as collected coin', () => {
    const { gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    expect(gameplayFacade.claimPlayerShopSaleProceeds(5)).toEqual({
      ok: true,
      coin: 5,
    });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(5);
    expect(gameplayFacade.getSnapshot().coin.totalGenerated).toBe(0);
    expect(gameplayFacade.getSnapshot().stats.coin.playerTrade).toBe(5);
    expect(rewardEvents).toEqual([
      expect.objectContaining({
        type: 'coin_collected',
        coin: 5,
        source: 'player_shop_proceeds',
      }),
    ]);
    unsubscribeRewardEvents();
  });

  it('persists player shop proceeds without adding generated coin', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.coinFacade.add(10);
    expect(first.gameplayFacade.claimPlayerShopSaleProceeds(5)).toEqual({
      ok: true,
      coin: 5,
    });
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });
    const snapshot = second.gameplayFacade.getSnapshot();

    expect(snapshot.coin.current).toBe(15);
    expect(snapshot.coin.totalGenerated).toBe(10);
    expect(snapshot.stats.coin.playerTrade).toBe(5);
  });

  it('persists crystal-tab coin offer cooldown and catches it up offline', () => {
    const persistenceStorage = createMemoryStorage();
    let now = 1_000_000;
    const first = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });

    first.gameplayFacade.collectShopCoinOffer();
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    now += 3_600_000;
    const second = createGameplay({
      persistenceStorage,
      persistenceNow: () => now,
    });
    expect(second.gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
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
    expect(third.gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      cooldownRemainingSeconds: 0,
      canCollect: true,
    });
    third.gameplayFacade.shutdown();
    third.ecsFacade.destroyWorld();
  });

  it('keeps crystal-tab coin offer cooldown through the legacy goldOffer save branch', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

    gameplayFacade.loadPersistenceSave(
      {
        version: 7,
        savedAt: 1_000,
        shop: {
          goldOffer: {
            cooldownRemainingSeconds: 3_600,
          },
        },
      },
      ecsFacade,
    );

    expect(gameplayFacade.getSnapshot().shop.coinOffer).toMatchObject({
      cooldownRemainingSeconds: 3_600,
      canCollect: false,
    });

    const save = gameplayFacade.createPersistenceSave();
    expect(save.shop.coinOffer).toEqual({
      cooldownRemainingSeconds: 3_600,
    });
    expect(save.shop.goldOffer).toEqual(save.shop.coinOffer);
  });

  it('excludes cauldron-staged herbs from NPC market sales', () => {
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);
    openFirstNpcMarketStand(gameplayFacade);

    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1001);

    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems.find((item) => item.key === 'sageHerb'))
      .toMatchObject({
        quantity: 1,
        sellCoin: 6,
      });
    expect(gameplayFacade.getSnapshot().shop.shelf.slots[0]).toMatchObject({
      sellItemTypeId: 1001,
      sellQuantity: 1,
    });

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(6);
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

    shopNowMs = 10_000;
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(6);
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
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    openFirstNpcMarketStand(gameplayFacade);

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(1);

    shopNowMs = 4_000;
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
    });

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 1 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(0);
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

    openFirstPlayerMarketStand(gameplayFacade);
    gameplayFacade.itemsFacade.addItem(1, 13);

    expect(
      gameplayFacade.setSelectedPlayerShopShelfSlotListing({
        itemTypeId: 1,
        quantity: 2,
        priceCoin: 4,
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
      priceCoin: 4,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 11,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.playerShelf.slots[0]).toMatchObject({
      slotNumber: 1,
      itemTypeId: 1,
      itemKey: 'sageSeed',
      itemLabel: 'sage seed',
      itemKind: 'seed',
      quantity: 2,
      priceCoin: 4,
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
        quantity: 13,
      },
    ]);
  });

  it('excludes cauldron-staged herbs from player market listings', () => {
    const { gameplayFacade } = createGameplay();

    openFirstPlayerMarketStand(gameplayFacade);
    gameplayFacade.itemsFacade.addItem(1001, 3);
    gameplayFacade.addBrewingIngredient(1001);
    gameplayFacade.addBrewingIngredient(1001);

    expect(
      gameplayFacade.setSelectedPlayerShopShelfSlotListing({
        itemTypeId: 1001,
        quantity: 2,
        priceCoin: 4,
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
        priceCoin: 4,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 1,
      priceCoin: 4,
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
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    gameplayFacade.coinFacade.add(10);

    expect(
      gameplayFacade.buyPlayerShopListingItem({
        listingKey: 'listing-1',
        itemKey: 'sageSeed',
        quantity: 2,
        priceCoin: 3,
      }),
    ).toMatchObject({
      ok: true,
      quantity: 2,
      priceCoin: 3,
      totalPriceCoin: 6,
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(4);
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
        quantity: 2,
      },
    ]);
    expect(rewardEvents).toEqual([
      expect.objectContaining({
        type: 'item_bought',
        source: 'player_market',
        listingKey: 'listing-1',
        item: {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        },
        quantity: 2,
        coin: 6,
      }),
    ]);

    expect(gameplayFacade.claimPlayerShopSaleProceeds(5)).toEqual({
      ok: true,
      coin: 5,
    });
    expect(gameplayFacade.getSnapshot().coin.current).toBe(9);
    expect(gameplayFacade.getSnapshot().stats.coin.playerTrade).toBe(5);
    unsubscribeRewardEvents();
  });

  it('publishes bought-item reward events for NPC stock buys', async () => {
    const { gameplayFacade } = createGameplay();
    const rewardEvents = [];
    const unsubscribeRewardEvents = gameplayFacade.subscribeRewardEvents((event) => {
      rewardEvents.push(event);
    });

    advanceToLevel(gameplayFacade, 4);
    gameplayFacade.setNpcMarketFacade({
      getNpcBuyPriceCoin: () => 1,
      getNpcNeed: () => 1000,
      sellToNpc: () => Promise.resolve({ ok: true }),
      getNpcSellPriceCoin: () => 2,
      getNpcStock: () => 20,
      buyFromNpc: () => Promise.resolve({ ok: true }),
    });
    gameplayFacade.coinFacade.add(40);

    await expect(gameplayFacade.buyNpcMarketStockItem(1, 15)).resolves.toMatchObject({
      ok: true,
      item: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'sage seed',
        kind: 'seed',
      },
      quantity: 15,
      totalPriceCoin: 30,
    });
    expect(rewardEvents).toEqual([
      expect.objectContaining({
        type: 'item_bought',
        source: 'npc_stock',
        item: {
          itemTypeId: 1,
          key: 'sageSeed',
          label: 'sage seed',
          kind: 'seed',
        },
        quantity: 15,
        coin: 30,
      }),
    ]);
    unsubscribeRewardEvents();
  });

  it('auto sells only the selected item type', () => {
    let shopNowMs = 0;
    const { ecsFacade, gameplayFacade } = createGameplay({
      shopNow: () => shopNowMs,
    });
    setShopAutoSellSeconds(gameplayFacade, 5);
    openFirstNpcMarketStand(gameplayFacade);

    gameplayFacade.itemsFacade.addItem(1, 1);
    gameplayFacade.itemsFacade.addItem(2, 1);
    gameplayFacade.setSelectedShopShelfSlotSellItem(2);

    shopNowMs = 5_000;
    ecsFacade.update({ deltaSeconds: 5 });

    expect(gameplayFacade.getSnapshot().coin.current).toBe(1);
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

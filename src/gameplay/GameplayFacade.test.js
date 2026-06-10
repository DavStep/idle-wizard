import { describe, expect, it } from 'vitest';

import { EcsFacade } from '../ecs/EcsFacade.js';
import { GameplayFacade } from './GameplayFacade.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function createGameplay({ persistenceStorage, persistenceNow = () => 0 } = {}) {
  const ecsFacade = new EcsFacade();
  const gameplayFacade = new GameplayFacade({ persistenceStorage, persistenceNow });
  ecsFacade.createWorld();
  gameplayFacade.initialize(ecsFacade);
  return { ecsFacade, gameplayFacade };
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
        message: 'researched Sage Seed',
      }),
    );
    expect(snapshot.inventory).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'Sage Seed',
      kind: 'seed',
      quantity: 3,
    });
    expect(snapshot.research.completedResearchIds).toEqual(['unlockSeed:sageSeed']);
    expect(snapshot.brewing.ingredients).toEqual([
      {
        slotIndex: 0,
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'Sage',
        kind: 'herb',
      },
    ]);
    expect(snapshot.shop.shelf.slots[0]).toMatchObject({
      slotNumber: 1,
      sellItemTypeId: 1,
      sellKind: 'seed',
      sellLabel: 'Sage Seed',
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

    expect(snapshot.garden.plot.unlockedTiles).toBe(1);
    expect(snapshot.shop.shelf.unlockedSlots).toBe(1);
    expect(snapshot.shop.playerShelf.unlockedSlots).toBe(1);
  });

  it('fills tasks from inventory and advances player level', () => {
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

    expect(gameplayFacade.getSnapshot().tasks.currentLevel).toBe(2);
    expect(gameplayFacade.getSnapshot().tasks.level.totalTasks).toBe(5);
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
    expect(gameplayFacade.getSnapshot().mana.cap).toBe(60);
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBeCloseTo(1.1);

    gameplayFacade.goldFacade.add(125);
    gameplayFacade.buyResearch('manaProductionRate:1');
    gameplayFacade.buyResearch('manaSphereCap:1');

    expect(gameplayFacade.getSnapshot().mana.cap).toBe(110);
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBeCloseTo(2.1);
  });

  it('logs completed gameplay events', () => {
    const { ecsFacade, gameplayFacade } = createGameplay();

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
      'researched Sage Seed',
      'summoned Sage Seed',
      'sold Sage Seed for 1 gold',
      'brewed Wasted Potion',
      'planted Sage Seed',
      'harvested Sage',
    ]);
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

  it('resets version 1 gameplay saves but keeps lifetime generated gold', () => {
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
      }),
    );

    const { gameplayFacade } = createGameplay({ persistenceStorage });
    const snapshot = gameplayFacade.getSnapshot();

    expect(snapshot.gold.current).toBe(0);
    expect(snapshot.gold.totalGenerated).toBe(18);
    expect(snapshot.inventory).toEqual([]);
    expect(snapshot.research.completedResearchIds).toEqual([]);
    expect(snapshot.tasks.currentLevel).toBe(1);
    expect(snapshot.tasks.level.tasks).toHaveLength(5);
    expect(gameplayFacade.consumeProgressResetPending()).toBe(true);
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
        label: 'Mana Tonic',
        kind: 'potion',
      },
    });
    expect(second.gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(second.gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
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

  it('persists mana research effects across a new app instance', () => {
    const persistenceStorage = createMemoryStorage();
    const first = createGameplay({ persistenceStorage });

    first.gameplayFacade.goldFacade.add(125);
    first.gameplayFacade.buyResearch('manaProductionRate:1');
    first.gameplayFacade.buyResearch('manaSphereCap:1');
    first.gameplayFacade.shutdown();
    first.ecsFacade.destroyWorld();

    const second = createGameplay({ persistenceStorage });

    expect(second.gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'manaProductionRate:1',
      'manaSphereCap:1',
    ]);
    expect(second.gameplayFacade.getSnapshot().mana).toMatchObject({
      cap: 100,
      perSecond: 2,
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
    expect(result.seed.label).toMatch(/Seed$/);
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
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 0,
      },
    );
    expect(gameplayFacade.getSnapshot().seedInventory).toContainEqual({
      itemTypeId: 14,
      key: 'dragonpepperSeed',
      label: 'Dragonpepper Seed',
      kind: 'seed',
      quantity: 0,
    });
  });

  it('exposes research boxes for mana, seeds, summon counts, and recipes', () => {
    const { gameplayFacade } = createGameplay();
    const research = gameplayFacade.getSnapshot().research;

    expect(research.boxes.map((box) => box.id)).toEqual([
      'manaSphere',
      'seedUnlocks',
      'summonSeeds',
      'recipeUnlocks',
    ]);
    expect(research.boxes[0].researches).toEqual([
      {
        id: 'manaProductionRate:1',
        seriesId: 'manaProductionRate',
        level: 1,
        label: 'mana production rate 1',
        value: '75 gold',
        effect: '+1/sec',
        showEffect: true,
        requiredResearchIds: [],
        description: 'increases mana gained each second by 1.',
        costGold: 75,
        completed: false,
        canResearch: false,
      },
      {
        id: 'manaSphereCap:1',
        seriesId: 'manaSphereCap',
        level: 1,
        label: 'mana sphere cap 1',
        value: '50 gold',
        effect: '+50 cap',
        showEffect: true,
        requiredResearchIds: [],
        description: 'increases mana sphere capacity by 50.',
        costGold: 50,
        completed: false,
        canResearch: false,
      },
    ]);
    expect(research.boxes[1].researches).toHaveLength(14);
    expect(research.boxes[1].researches[0]).toEqual({
      id: 'unlockSeed:sageSeed',
      label: 'Sage Seed',
      value: 'free',
      effect: 'drop',
      description: 'allows Sage Seed to drop from summon seed.',
      costGold: 0,
      completed: false,
      canResearch: true,
    });
    expect(research.boxes[2].researches).toEqual([
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
    expect(research.boxes[3].researches).toHaveLength(18);
    expect(research.boxes[3].researches[0]).toEqual({
      id: 'unlockRecipe:manaTonic',
      label: 'Mana Tonic',
      value: '80 gold',
      effect: 'brew',
      description: 'allows valid cauldron ingredients to brew Mana Tonic.',
      costGold: 80,
      completed: false,
      canResearch: false,
    });
  });

  it('buys research with gold from research balance', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(75);

    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[0]).toMatchObject({
      id: 'manaProductionRate:1',
      value: '75 gold',
      costGold: 75,
      completed: false,
      canResearch: true,
    });

    expect(gameplayFacade.buyResearch('manaProductionRate:1')).toEqual({
      ok: true,
      researchId: 'manaProductionRate:1',
      cost: 75,
    });
    expect(gameplayFacade.getSnapshot().gold.current).toBe(0);
    expect(gameplayFacade.getSnapshot().gold.totalGenerated).toBe(75);
    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[0]).toMatchObject({
      id: 'manaProductionRate:2',
      value: '150 gold',
      effect: '+1/sec',
      costGold: 150,
      completed: false,
      canResearch: false,
    });
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBe(2);
    expect(gameplayFacade.getSnapshot().research.completedResearchIds).toEqual([
      'manaProductionRate:1',
    ]);
    expect(gameplayFacade.buyResearch('manaProductionRate:1')).toEqual({
      ok: false,
      reason: 'already_researched',
      researchId: 'manaProductionRate:1',
      cost: 75,
    });
  });

  it('shows the next mana cap research after buying the current one', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(150);

    expect(gameplayFacade.buyResearch('manaSphereCap:1')).toEqual({
      ok: true,
      researchId: 'manaSphereCap:1',
      cost: 50,
    });
    expect(gameplayFacade.getSnapshot().mana.cap).toBe(100);
    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[1]).toMatchObject({
      id: 'manaSphereCap:2',
      label: 'mana sphere cap 2',
      value: '100 gold',
      effect: '+50 cap',
      costGold: 100,
      completed: false,
      canResearch: true,
    });
  });

  it('rejects buying mana research levels out of order', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(20);

    expect(gameplayFacade.buyResearch('manaProductionRate:2')).toEqual({
      ok: false,
      reason: 'missing_required_research',
      researchId: 'manaProductionRate:2',
      requiredResearchId: 'manaProductionRate:1',
      cost: 150,
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

  it('maps legacy mana research ids to first-level upgrades', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.goldFacade.add(75);

    expect(gameplayFacade.buyResearch('manaProductionRate')).toEqual({
      ok: true,
      researchId: 'manaProductionRate:1',
      cost: 75,
    });
    expect(gameplayFacade.getSnapshot().mana.perSecond).toBe(2);
  });

  it('rejects research purchase without enough gold', () => {
    const { gameplayFacade } = createGameplay();

    expect(gameplayFacade.buyResearch('manaSphereCap')).toEqual({
      ok: false,
      reason: 'not_enough_gold',
      researchId: 'manaSphereCap:1',
      cost: 50,
    });
    expect(gameplayFacade.getSnapshot().research.boxes[0].researches[1]).toMatchObject({
      completed: false,
      value: '50 gold',
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
      label: 'Mana Tonic',
      unlocked: true,
      ingredients: [
        {
          key: 'sageHerb',
          label: 'Sage',
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
      buttonLabel: 'brew Mana Tonic',
      manaCost: 12,
      canBrew: true,
      match: {
        key: 'manaTonic',
        label: 'Mana Tonic',
        unlocked: true,
      },
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      wasted: false,
      potion: {
        itemTypeId: 2001,
        key: 'manaTonic',
        label: 'Mana Tonic',
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
      label: 'Mana Tonic',
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
        label: 'Mana Tonic',
        kind: 'potion',
      },
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().brewing.activeBrew).toBeNull();
    expect(gameplayFacade.getSnapshot().inventory).toContainEqual({
      itemTypeId: 2001,
      key: 'manaTonic',
      label: 'Mana Tonic',
      kind: 'potion',
      quantity: 1,
    });
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
        label: 'Mana Tonic',
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
      label: 'Sage',
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
        label: 'Wasted Potion',
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
        label: 'Wasted Potion',
        kind: 'potion',
      },
      quantity: 1,
    });

    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 2029,
        key: 'wastedPotion',
        label: 'Wasted Potion',
        kind: 'potion',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.shelf.sellItems).toContainEqual({
      itemTypeId: 2029,
      key: 'wastedPotion',
      label: 'Wasted Potion',
      kind: 'potion',
      hasRecipe: false,
      baseSellPrice: 1,
      quantity: 1,
      sellGold: 1,
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
      nextSlotRequiresLevel: 5,
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
      requiredLevel: 5,
      slotNumber: 2,
    });

    for (let levelCount = 1; levelCount < 5; levelCount += 1) {
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
      maxUnlockedTilesByLevel: 1,
      tilesPerRow: 4,
      tileCosts: [0, 25, 75, 175, 400, 800, 1400, 2200, 3300, 4800],
      nextTileNumber: 2,
      nextTileCost: 25,
      nextTileLockedByLevel: true,
      nextTileRequiresLevel: 3,
      harvestSeconds: 10,
    });
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'Sage',
      kind: 'herb',
      quantity: 0,
    });

    expect(gameplayFacade.buyGardenTile()).toEqual({
      ok: false,
      reason: 'level_locked',
      requiredLevel: 3,
      tileNumber: 2,
    });

    finishCurrentTaskLevel(gameplayFacade);
    finishCurrentTaskLevel(gameplayFacade);

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
        label: 'Sage Seed',
        kind: 'seed',
      },
      herb: {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'Sage',
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
      herbLabel: 'Sage',
    });

    expect(gameplayFacade.startGardenHarvest(1)).toEqual({
      ok: true,
      tileNumber: 1,
      herb: {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'Sage',
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
      selectedSeedLabel: 'Sage Seed',
      seedItemTypeId: null,
      herbItemTypeId: null,
      process: null,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1001,
        key: 'sageHerb',
        label: 'Sage',
        kind: 'herb',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'Sage',
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
      selectedSeedLabel: 'Sage Seed',
      seedItemTypeId: null,
      herbItemTypeId: null,
      process: null,
    });
    expect(gameplayFacade.getSnapshot().garden.herbs).toContainEqual({
      itemTypeId: 1001,
      key: 'sageHerb',
      label: 'Sage',
      kind: 'herb',
      quantity: 1,
    });
    expect(gameplayFacade.getSnapshot().garden.seeds).toContainEqual({
      itemTypeId: 1,
      key: 'sageSeed',
      label: 'Sage Seed',
      kind: 'seed',
      quantity: 1,
    });

    expect(gameplayFacade.plantSelectedGardenSeed(1)).toMatchObject({
      ok: true,
      tileNumber: 1,
      seed: {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
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

  it('plants non-Sage garden seeds into their matching herbs', () => {
    const { gameplayFacade } = createGameplay();

    gameplayFacade.itemsFacade.addItem(2, 1);

    expect(gameplayFacade.plantGardenSeed(1, 2)).toMatchObject({
      ok: true,
      seed: {
        key: 'mintSeed',
        label: 'Mint Seed',
      },
      herb: {
        key: 'mintHerb',
        label: 'Mint',
      },
    });
    expect(gameplayFacade.getSnapshot().garden.plot.tiles[0]).toMatchObject({
      phase: 'growing',
      seedKey: 'mintSeed',
      seedLabel: 'Mint Seed',
      herbKey: 'mintHerb',
      herbLabel: 'Mint',
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
      requiredLevel: 5,
      slotNumber: 2,
    });

    for (let levelCount = 1; levelCount < 5; levelCount += 1) {
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
          potionLabel: 'Ashen Memory',
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
      canBrew: true,
      match: {
        key: 'ashenMemory',
        label: 'unknown recipe',
        realLabel: 'Ashen Memory',
        unlocked: false,
        discoverable: true,
      },
    });

    expect(gameplayFacade.brewCauldron()).toMatchObject({
      ok: true,
      wasted: false,
      potion: {
        itemTypeId: 2019,
        key: 'ashenMemory',
        label: 'Ashen Memory',
        kind: 'potion',
      },
      discovery: {
        potionKey: 'ashenMemory',
        potionLabel: 'Ashen Memory',
      },
      manaCost: 36,
      durationMs: 80_000,
    });

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
        label: 'Sage Seed',
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
        label: 'Sage Seed',
        kind: 'seed',
      },
      quantity: 2,
      priceGold: 4,
    });
    expect(gameplayFacade.getSnapshot().inventory).toEqual([
      {
        itemTypeId: 1,
        key: 'sageSeed',
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
    expect(gameplayFacade.getSnapshot().shop.playerShelf.slots[0]).toMatchObject({
      slotNumber: 1,
      itemTypeId: 1,
      itemKey: 'sageSeed',
      itemLabel: 'Sage Seed',
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
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 3,
      },
    ]);
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
        label: 'Sage Seed',
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
        label: 'Sage Seed',
        kind: 'seed',
        quantity: 1,
      },
    ]);
  });
});

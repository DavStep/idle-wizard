import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { itemKinds } from '../../items/itemKinds.js';
import { taskRequirementTypes } from '../taskRequirementTypes.js';
import { TaskBalanceManager } from './TaskBalanceManager.js';

const potionResearchOrder = [
  'manaTonic',
  'minorHealingPotion',
  'nettleVigor',
  'calmingDraught',
  'briarWard',
  'lanternTonic',
  'simpleAntidote',
  'venomDraught',
  'healingPotion',
  'sunrootStamina',
  'moonlitFocus',
  'frostmossCleanse',
  'sleepDraught',
  'elixirOfLife',
  'starLuckPhiltre',
  'deepDreamVision',
  'pactWard',
  'dragonCourage',
  'silverleafSalve',
  'yarrowPoultice',
  'hyssopClarity',
  'valerianRest',
  'comfreyBalm',
  'nightshadeVeil',
  'belladonnaSight',
  'wormwoodPurge',
  'snowdropBreath',
  'pearlrootDraught',
];

function createManager(balance) {
  return new TaskBalanceManager({
    itemsFacade: new ItemsFacade(),
    ...(balance ? { balance } : {}),
  });
}

function getTaskSummary(task) {
  return {
    id: task.id,
    type: task.type,
    action: task.action,
    researchId: task.researchId,
    itemKey: task.itemKey,
    requiredQuantity: task.requiredQuantity,
    requirementLabel: task.requirementLabel,
  };
}

describe('TaskBalanceManager', () => {
  it('keeps legacy item-only rows as turn-in requirements', () => {
    const taskBalanceManager = createManager({
      levels: [
        {
          level: 1,
          completionCostGold: 10,
          tasks: [{ id: 'level1-sage-seeds', itemKey: 'sageSeed', quantity: 4 }],
        },
      ],
    });

    expect(taskBalanceManager.getLevelCompletionCostCoin(1)).toBe(10);
    expect(getTaskSummary(taskBalanceManager.getLevelTasks(1)[0])).toEqual({
      id: 'level1-sage-seeds',
      type: taskRequirementTypes.TURN_IN,
      action: taskRequirementTypes.TURN_IN,
      researchId: null,
      itemKey: 'sageSeed',
      requiredQuantity: 4,
      requirementLabel: 'turn in sage seed',
    });
  });

  it('parses all requirement types with player-facing labels', () => {
    const taskBalanceManager = createManager({
      levels: [
        {
          level: 1,
          completionCostCoin: 0,
          tasks: [
            {
              id: 'research-mint',
              type: 'research',
              researchId: 'unlockSeed:mintSeed',
              quantity: 1,
            },
            { id: 'summon-mint', type: 'summon', itemKey: 'mintSeed', quantity: 3 },
            { id: 'grow-sage', type: 'grow', itemKey: 'sageHerb', quantity: 2 },
            { id: 'brew-tonic', type: 'brew', itemKey: 'manaTonic', quantity: 1 },
            { id: 'sell-sage', type: 'sell', itemKey: 'sageSeed', quantity: 1 },
          ],
        },
      ],
    });

    expect(taskBalanceManager.getLevelTasks(1).map(getTaskSummary)).toEqual([
      {
        id: 'research-mint',
        type: 'research',
        action: 'research',
        researchId: 'unlockSeed:mintSeed',
        itemKey: 'mintSeed',
        requiredQuantity: 1,
        requirementLabel: 'research mint seed',
      },
      {
        id: 'summon-mint',
        type: 'summon',
        action: 'summon',
        researchId: null,
        itemKey: 'mintSeed',
        requiredQuantity: 3,
        requirementLabel: 'summon mint seed',
      },
      {
        id: 'grow-sage',
        type: 'grow',
        action: 'grow',
        researchId: null,
        itemKey: 'sageHerb',
        requiredQuantity: 2,
        requirementLabel: 'grow sage',
      },
      {
        id: 'brew-tonic',
        type: 'brew',
        action: 'brew',
        researchId: null,
        itemKey: 'manaTonic',
        requiredQuantity: 1,
        requirementLabel: 'brew mana tonic',
      },
      {
        id: 'sell-sage',
        type: 'sell',
        action: 'sell',
        researchId: null,
        itemKey: 'sageSeed',
        requiredQuantity: 1,
        requirementLabel: 'sell sage seed',
      },
    ]);
  });

  it('uses action-based onboarding requirements for levels 1 through 5', () => {
    const taskBalanceManager = createManager();

    expect([1, 2, 3, 4, 5].map((level) =>
      taskBalanceManager.getLevelTasks(level).map((task) => ({
        type: task.type,
        researchId: task.researchId,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    )).toEqual([
      [
        { type: 'summon', researchId: null, itemKey: 'sageSeed', requiredQuantity: 1 },
        { type: 'turnIn', researchId: null, itemKey: 'sageSeed', requiredQuantity: 1 },
      ],
      [
        { type: 'summon', researchId: null, itemKey: 'sageSeed', requiredQuantity: 5 },
        { type: 'sell', researchId: null, itemKey: 'sageSeed', requiredQuantity: 1 },
        { type: 'turnIn', researchId: null, itemKey: 'sageSeed', requiredQuantity: 4 },
      ],
      [
        {
          type: 'research',
          researchId: 'unlockSeed:mintSeed',
          itemKey: 'mintSeed',
          requiredQuantity: 1,
        },
        { type: 'summon', researchId: null, itemKey: 'mintSeed', requiredQuantity: 3 },
        { type: 'turnIn', researchId: null, itemKey: 'mintSeed', requiredQuantity: 3 },
      ],
      [
        { type: 'grow', researchId: null, itemKey: 'sageHerb', requiredQuantity: 4 },
        { type: 'grow', researchId: null, itemKey: 'mintHerb', requiredQuantity: 2 },
        { type: 'turnIn', researchId: null, itemKey: 'sageHerb', requiredQuantity: 4 },
        { type: 'turnIn', researchId: null, itemKey: 'mintHerb', requiredQuantity: 2 },
      ],
      [
        {
          type: 'research',
          researchId: 'unlockRecipe:manaTonic',
          itemKey: 'manaTonic',
          requiredQuantity: 1,
        },
        { type: 'brew', researchId: null, itemKey: 'manaTonic', requiredQuantity: 3 },
        { type: 'turnIn', researchId: null, itemKey: 'manaTonic', requiredQuantity: 3 },
      ],
    ]);
  });

  it('extends the richer requirement curve to level 100', () => {
    const taskBalanceManager = createManager();

    expect(taskBalanceManager.getMaxLevel()).toBe(100);
    expect(taskBalanceManager.getLevelTasks(100).map((task) => ({
      type: task.type,
      itemKey: task.itemKey,
      requiredQuantity: task.requiredQuantity,
    }))).toEqual([
      { type: 'brew', itemKey: 'pearlrootDraught', requiredQuantity: 175 },
      { type: 'turnIn', itemKey: 'pearlrootDraught', requiredQuantity: 138 },
      { type: 'brew', itemKey: 'pactWard', requiredQuantity: 175 },
      { type: 'turnIn', itemKey: 'silverleafSalve', requiredQuantity: 138 },
      { type: 'sell', itemKey: 'glowcapHerb', requiredQuantity: 362 },
    ]);
  });

  it('uses decade walls with relief after each wall', () => {
    const taskBalanceManager = createManager();

    expect(getLevelEffort(taskBalanceManager, 9)).toBeGreaterThan(
      getLevelEffort(taskBalanceManager, 8),
    );
    expect(getLevelEffort(taskBalanceManager, 9)).toBeGreaterThan(
      getLevelEffort(taskBalanceManager, 10),
    );
    expect(getLevelEffort(taskBalanceManager, 9)).toBeGreaterThan(
      getLevelEffort(taskBalanceManager, 11),
    );

    for (const wallLevel of [19, 29, 39, 49, 59, 69, 79, 89, 99]) {
      const wallEffort = getLevelEffort(taskBalanceManager, wallLevel);

      expect(wallEffort, `config level ${wallLevel}`).toBeGreaterThan(
        getLevelEffort(taskBalanceManager, wallLevel - 1),
      );
      expect(wallEffort, `config level ${wallLevel}`).toBeGreaterThan(
        getLevelEffort(taskBalanceManager, wallLevel + 1),
      );
      expect(wallEffort, `config level ${wallLevel}`).toBeGreaterThan(
        getLevelEffort(taskBalanceManager, wallLevel + 2),
      );
    }
  });

  it('keeps task ids unique and level rows compact', () => {
    const taskBalanceManager = createManager();
    const taskIds = new Set();

    for (const level of taskBalanceManager.getLevels()) {
      expect(level.tasks.length, `config level ${level.level}`).toBeGreaterThanOrEqual(1);
      expect(level.tasks.length, `config level ${level.level}`).toBeLessThanOrEqual(5);

      for (const task of level.tasks) {
        expect(taskIds.has(task.id), `duplicate task id ${task.id}`).toBe(false);
        taskIds.add(task.id);
        expect(task.requiredQuantity, task.id).toBeGreaterThan(0);
      }
    }
  });

  it('hands off research unlocks into production on the next level after onboarding', () => {
    const taskBalanceManager = createManager();

    expectNextLevelProduction(taskBalanceManager, 'unlockSeed:glowcapSeed', [
      'summon:glowcapSeed',
      'grow:glowcapHerb',
      'turnIn:glowcapHerb',
    ]);
    expectNextLevelProduction(taskBalanceManager, 'unlockSeed:mandrakeSeed', [
      'summon:mandrakeSeed',
      'grow:mandrakeHerb',
      'turnIn:mandrakeHerb',
    ]);
    expectNextLevelProduction(taskBalanceManager, 'unlockRecipe:lanternTonic', [
      'brew:lanternTonic',
      'turnIn:lanternTonic',
    ]);
    expectNextLevelProduction(taskBalanceManager, 'unlockRecipe:pearlrootDraught', [
      'brew:pearlrootDraught',
      'turnIn:pearlrootDraught',
    ]);
  });

  it('uses every requirement type in the default curve', () => {
    const taskBalanceManager = createManager();
    const types = new Set(taskBalanceManager.getTasks().map((task) => task.type));

    expect([...types].sort()).toEqual([
      'brew',
      'grow',
      'research',
      'sell',
      'summon',
      'turnIn',
    ]);
  });

  it('keeps research unlocks active through the late levels', () => {
    const taskBalanceManager = createManager();
    const lateResearchLevels = taskBalanceManager
      .getLevels()
      .filter((level) =>
        level.level >= 80 &&
        level.tasks.some((task) => task.type === taskRequirementTypes.RESEARCH),
      )
      .map((level) => level.level);

    expect(lateResearchLevels).toEqual([80, 82, 84, 85, 87, 89, 91, 93, 95, 97, 99]);
    expectNextLevelProduction(taskBalanceManager, 'unlockRecipe:pearlrootDraught', [
      'brew:pearlrootDraught',
      'turnIn:pearlrootDraught',
    ]);
  });

  it('does not skip seed, herb, or recipe order in level tasks', () => {
    const itemsFacade = new ItemsFacade();
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade });
    const seedDefinitions = itemsFacade.getSeedDefinitions();
    const seedTierByKey = new Map(
      seedDefinitions.map((seed, index) => [seed.key, index + 1]),
    );
    const herbTierByKey = new Map(
      seedDefinitions.map((seed, index) => [
        itemsFacade.getItemDefinition(seed.producesHerbTypeId).key,
        index + 1,
      ]),
    );
    const potionResearchIndexByKey = new Map(
      potionResearchOrder.map((potionKey, index) => [potionKey, index + 1]),
    );

    let highestSeenSeedTier = 0;
    let highestSeenRecipeIndex = 0;

    for (const task of taskBalanceManager.getTasks()) {
      if (task.itemKind === itemKinds.seed || task.itemKind === itemKinds.herb) {
        const tier =
          task.itemKind === itemKinds.seed
            ? seedTierByKey.get(task.itemKey)
            : herbTierByKey.get(task.itemKey);

        expect(tier, task.itemKey).toBeLessThanOrEqual(highestSeenSeedTier + 1);
        highestSeenSeedTier = Math.max(highestSeenSeedTier, tier);
      }

      if (task.itemKind === itemKinds.potion && potionResearchIndexByKey.has(task.itemKey)) {
        const researchIndex = potionResearchIndexByKey.get(task.itemKey);

        expect(researchIndex, task.itemKey).toBeLessThanOrEqual(
          highestSeenRecipeIndex + 1,
        );
        highestSeenRecipeIndex = Math.max(highestSeenRecipeIndex, researchIndex);
      }
    }
  });
});

function expectNextLevelProduction(taskBalanceManager, researchId, expected) {
  const researchLevel = taskBalanceManager
    .getLevels()
    .find((level) => level.tasks.some((task) => task.researchId === researchId));

  expect(researchLevel, researchId).toBeTruthy();

  const nextLevel = taskBalanceManager.getLevelTasks(researchLevel.level + 1);
  const nextSignatures = nextLevel.map((task) => `${task.type}:${task.itemKey}`);

  expect(nextSignatures).toEqual(expect.arrayContaining(expected));
}

function getLevelEffort(taskBalanceManager, levelNumber) {
  return taskBalanceManager.getLevelTasks(levelNumber).reduce(
    (total, task) => total + getTaskEffortWeight(task.type) * task.requiredQuantity,
    0,
  );
}

function getTaskEffortWeight(type) {
  switch (type) {
    case taskRequirementTypes.SUMMON:
      return 1;
    case taskRequirementTypes.GROW:
    case taskRequirementTypes.SELL:
      return 2;
    case taskRequirementTypes.TURN_IN:
      return 3;
    case taskRequirementTypes.BREW:
      return 7;
    case taskRequirementTypes.RESEARCH:
    default:
      return 0;
  }
}

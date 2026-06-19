import { describe, expect, it } from 'vitest';

import { ItemsFacade } from '../../items/ItemsFacade.js';
import { itemKinds } from '../../items/itemKinds.js';
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
];

describe('TaskBalanceManager', () => {
  it('uses reduced level 1 sage requirements', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(1).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level1-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 5 },
    ]);
  });

  it('uses reduced level 2 sage requirements with herb first', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(2).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level2-sage-herb', itemKey: 'sageHerb', requiredQuantity: 3 },
      { id: 'level2-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 10 },
    ]);
  });

  it('uses low-tier rounded target level 5 requirements', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(4).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level4-nettle-seeds', itemKey: 'sageSeed', requiredQuantity: 50 },
      { id: 'level4-nettle-herb', itemKey: 'nettleHerb', requiredQuantity: 40 },
      { id: 'level4-sage-herb', itemKey: 'mintHerb', requiredQuantity: 20 },
      { id: 'level4-mana-tonic', itemKey: 'manaTonic', requiredQuantity: 5 },
    ]);
  });

  it('uses one potion through target level 10', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(9).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level9-briar-seeds', itemKey: 'lavenderSeed', requiredQuantity: 100 },
      { id: 'level9-glowcap-seeds', itemKey: 'glowcapHerb', requiredQuantity: 80 },
      { id: 'level9-glowcap-herb', itemKey: 'briarHerb', requiredQuantity: 40 },
      { id: 'level9-calming-draught', itemKey: 'calmingDraught', requiredQuantity: 10 },
    ]);
  });

  it('uses lower-medium target level 11 requirements with two potions', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(10).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level10-briar-ward', itemKey: 'nettleSeed', requiredQuantity: 132 },
      { id: 'level10-glowcap-seeds', itemKey: 'glowcapHerb', requiredQuantity: 99 },
      { id: 'level10-glowcap-herb', itemKey: 'lavenderHerb', requiredQuantity: 66 },
      { id: 'level10-calming-draught', itemKey: 'briarWard', requiredQuantity: 11 },
      { id: 'level10-briar-seeds', itemKey: 'calmingDraught', requiredQuantity: 8 },
    ]);
  });

  it('extends the task curve to level 100 with hard-tier quantities', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(taskBalanceManager.getMaxLevel()).toBe(100);
    expect(
      taskBalanceManager.getLevelTasks(99).map((task) => ({
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { itemKey: 'moonflowerSeed', requiredQuantity: 2750 },
      { itemKey: 'dragonpepperHerb', requiredQuantity: 1700 },
      { itemKey: 'bloodroseHerb', requiredQuantity: 1300 },
      { itemKey: 'dragonCourage', requiredQuantity: 200 },
      { itemKey: 'pactWard', requiredQuantity: 150 },
    ]);
  });

  it('does not repeat the same material set for three consecutive levels', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });
    const levels = taskBalanceManager.getLevels();

    for (let index = 2; index < levels.length; index += 1) {
      const materialSets = [levels[index - 2], levels[index - 1], levels[index]].map(
        (level) => level.tasks.map((task) => task.itemKey).join('|'),
      );

      expect(
        new Set(materialSets).size,
        `levels ${levels[index - 2].level}-${levels[index].level} repeat ${materialSets[0]}`,
      ).toBeGreaterThan(1);
    }
  });

  it('uses one potion for target levels 5-10 and two potions from target level 11 onward', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    for (const level of taskBalanceManager.getLevels()) {
      if (level.level < 4) {
        continue;
      }

      const targetLevel = Math.min(level.level + 1, taskBalanceManager.getMaxLevel());
      const expectedTaskCount = targetLevel <= 10 ? 4 : 5;

      expect(level.tasks, `config level ${level.level}`).toHaveLength(expectedTaskCount);
    }
  });

  it('keeps seed requirements on a different family than same-level items after tutorial levels', () => {
    const itemsFacade = new ItemsFacade();
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade });
    const seedDefinitions = itemsFacade.getSeedDefinitions();
    const seedFamilyLabelsByKey = new Map(
      seedDefinitions.map((seed) => [seed.key, seed.label.replace(/ seed$/, '')]),
    );

    for (const level of taskBalanceManager.getLevels()) {
      if (level.level < 4) {
        continue;
      }

      const itemLabels = level.tasks
        .filter((task) => task.itemKind !== itemKinds.seed)
        .map((task) => task.itemLabel);

      for (const seedTask of level.tasks.filter((task) => task.itemKind === itemKinds.seed)) {
        const seedFamilyLabel = seedFamilyLabelsByKey.get(seedTask.itemKey);

        expect(
          itemLabels.some((itemLabel) => itemLabel.includes(seedFamilyLabel)),
          `level ${level.level} should not pair ${seedTask.itemLabel} with same-family item`,
        ).toBe(false);
      }
    }
  });

  it('does not skip seed or recipe research order in level tasks', () => {
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

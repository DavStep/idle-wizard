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
      { id: 'level1-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 4 },
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
      { id: 'level2-sage-herb', itemKey: 'sageHerb', requiredQuantity: 2 },
      { id: 'level2-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 7 },
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
      { id: 'level4-nettle-seeds', itemKey: 'sageSeed', requiredQuantity: 37 },
      { id: 'level4-nettle-herb', itemKey: 'nettleHerb', requiredQuantity: 29 },
      { id: 'level4-sage-herb', itemKey: 'mintHerb', requiredQuantity: 15 },
      { id: 'level4-mana-tonic', itemKey: 'manaTonic', requiredQuantity: 4 },
    ]);
  });

  it('uses diversified target level 6 through 10 requirements', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      [5, 6, 7, 8, 9].map((level) =>
        taskBalanceManager.getLevelTasks(level).map((task) => ({
          itemKey: task.itemKey,
          requiredQuantity: task.requiredQuantity,
        })),
      ),
    ).toEqual([
      [
        { itemKey: 'nettleSeed', requiredQuantity: 45 },
        { itemKey: 'lavenderHerb', requiredQuantity: 36 },
        { itemKey: 'sageHerb', requiredQuantity: 18 },
        { itemKey: 'minorHealingPotion', requiredQuantity: 4 },
      ],
      [
        { itemKey: 'sageSeed', requiredQuantity: 53 },
        { itemKey: 'nettleHerb', requiredQuantity: 42 },
        { itemKey: 'mintHerb', requiredQuantity: 21 },
        { itemKey: 'nettleVigor', requiredQuantity: 5 },
      ],
      [
        { itemKey: 'mintSeed', requiredQuantity: 61 },
        { itemKey: 'briarHerb', requiredQuantity: 49 },
        { itemKey: 'sageHerb', requiredQuantity: 25 },
        { itemKey: 'minorHealingPotion', requiredQuantity: 6 },
      ],
      [
        { itemKey: 'sageSeed', requiredQuantity: 70 },
        { itemKey: 'lavenderHerb', requiredQuantity: 56 },
        { itemKey: 'nettleHerb', requiredQuantity: 28 },
        { itemKey: 'calmingDraught', requiredQuantity: 7 },
      ],
      [
        { itemKey: 'briarSeed', requiredQuantity: 79 },
        { itemKey: 'glowcapHerb', requiredQuantity: 46 },
        { itemKey: 'mintHerb', requiredQuantity: 23 },
        { itemKey: 'minorHealingPotion', requiredQuantity: 10 },
      ],
    ]);
  });

  it('uses one potion through target level 10 with lighter direct herbs', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(9).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level9-briar-seeds', itemKey: 'briarSeed', requiredQuantity: 79 },
      { id: 'level9-glowcap-seeds', itemKey: 'glowcapHerb', requiredQuantity: 46 },
      { id: 'level9-glowcap-herb', itemKey: 'mintHerb', requiredQuantity: 23 },
      {
        id: 'level9-calming-draught',
        itemKey: 'minorHealingPotion',
        requiredQuantity: 10,
      },
    ]);
  });

  it('uses lower-medium target level 11 requirements with no repeated glowcap wall', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(10).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level10-briar-ward', itemKey: 'lavenderSeed', requiredQuantity: 106 },
      { id: 'level10-glowcap-seeds', itemKey: 'briarHerb', requiredQuantity: 57 },
      { id: 'level10-glowcap-herb', itemKey: 'nettleHerb', requiredQuantity: 38 },
      { id: 'level10-calming-draught', itemKey: 'briarWard', requiredQuantity: 11 },
      { id: 'level10-briar-seeds', itemKey: 'nettleVigor', requiredQuantity: 8 },
    ]);
  });

  it('tapers the early reduction down to target level 20', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(19).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level19-moonflower-seeds', itemKey: 'moonflowerSeed', requiredQuantity: 216 },
      { id: 'level19-frostmoss-seeds', itemKey: 'sunrootHerb', requiredQuantity: 117 },
      { id: 'level19-frostmoss-herb', itemKey: 'frostmossHerb', requiredQuantity: 77 },
      { id: 'level19-healing-potion', itemKey: 'briarWard', requiredQuantity: 23 },
      { id: 'level19-venom-draught', itemKey: 'venomDraught', requiredQuantity: 16 },
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
      { itemKey: 'dreambellSeed', requiredQuantity: 2750 },
      { itemKey: 'starAniseHerb', requiredQuantity: 1224 },
      { itemKey: 'dragonpepperHerb', requiredQuantity: 936 },
      { itemKey: 'elixirOfLife', requiredQuantity: 250 },
      { itemKey: 'pactWard', requiredQuantity: 188 },
    ]);
  });

  it('does not repeat exact requirement items on adjacent levels from target level 6 onward', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });
    const levels = taskBalanceManager.getLevels();

    for (let index = 1; index < levels.length; index += 1) {
      const level = levels[index];

      if (level.level < 5) {
        continue;
      }

      const previousItemKeys = new Set(levels[index - 1].tasks.map((task) => task.itemKey));
      const repeatedItemKeys = level.tasks
        .map((task) => task.itemKey)
        .filter((itemKey) => previousItemKeys.has(itemKey));

      expect(
        repeatedItemKeys,
        `level ${levels[index - 1].level}->${level.level} repeats ${repeatedItemKeys.join(', ')}`,
      ).toEqual([]);
    }
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

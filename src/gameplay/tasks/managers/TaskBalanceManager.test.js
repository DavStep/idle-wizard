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

  it('uses reduced level 4 nettle requirements with a different seed family', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(4).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level4-nettle-seeds', itemKey: 'mintSeed', requiredQuantity: 81 },
      { id: 'level4-nettle-herb', itemKey: 'nettleHerb', requiredQuantity: 52 },
      { id: 'level4-sage-herb', itemKey: 'sageHerb', requiredQuantity: 16 },
      { id: 'level4-mana-tonic', itemKey: 'manaTonic', requiredQuantity: 3 },
    ]);
  });

  it('moves level 5 onto lavender and the second recipe tier', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(5).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level5-nettle-seeds', itemKey: 'nettleSeed', requiredQuantity: 120 },
      { id: 'level5-lavender-seeds', itemKey: 'mintSeed', requiredQuantity: 131 },
      { id: 'level5-lavender-herb', itemKey: 'lavenderHerb', requiredQuantity: 75 },
      {
        id: 'level5-minor-healing-potion',
        itemKey: 'minorHealingPotion',
        requiredQuantity: 9,
      },
      { id: 'level5-mana-tonic', itemKey: 'manaTonic', requiredQuantity: 8 },
    ]);
  });

  it('moves level 6 onto nettle vigor without recipe skips', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(6).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level6-nettle-vigor', itemKey: 'nettleVigor', requiredQuantity: 11 },
      { id: 'level6-lavender-seeds', itemKey: 'mintSeed', requiredQuantity: 152 },
      { id: 'level6-lavender-herb', itemKey: 'lavenderHerb', requiredQuantity: 88 },
      {
        id: 'level6-minor-healing-potion',
        itemKey: 'minorHealingPotion',
        requiredQuantity: 10,
      },
      { id: 'level6-nettle-seeds', itemKey: 'sageSeed', requiredQuantity: 144 },
    ]);
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

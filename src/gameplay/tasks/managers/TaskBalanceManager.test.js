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

function getRequiredQuantityTotal(level) {
  return level.tasks.reduce((total, task) => total + task.requiredQuantity, 0);
}

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
      { id: 'level1-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 1 },
    ]);
  });

  it('uses the free level 1 completion cost', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(taskBalanceManager.getLevelCompletionCostCoin(1)).toBe(0);
  });

  it('accepts legacy SpacetimeDB completionCostGold runtime costs', () => {
    const taskBalanceManager = new TaskBalanceManager({
      itemsFacade: new ItemsFacade(),
      balance: {
        levels: [
          {
            level: 1,
            completionCostGold: 10,
            tasks: [{ id: 'level1-sage-seeds', itemKey: 'sageSeed', quantity: 4 }],
          },
        ],
      },
    });

    expect(taskBalanceManager.getLevelCompletionCostCoin(1)).toBe(10);
  });

  it('uses level 2 as the first normal market coin gate', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(taskBalanceManager.getLevelCompletionCostCoin(2)).toBe(4);
    expect(
      taskBalanceManager.getLevelTasks(2).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level2-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 5 },
    ]);
  });

  it('introduces herbs on level 4 requirements', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(4).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level4-sage-seeds', itemKey: 'sageSeed', requiredQuantity: 6 },
      { id: 'level4-sage-herb', itemKey: 'sageHerb', requiredQuantity: 2 },
      { id: 'level4-mint-herb', itemKey: 'mintHerb', requiredQuantity: 1 },
    ]);
  });

  it('uses diversified level 5 through 9 onboarding requirements', () => {
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
        { itemKey: 'sageSeed', requiredQuantity: 8 },
        { itemKey: 'mintHerb', requiredQuantity: 2 },
        { itemKey: 'manaTonic', requiredQuantity: 1 },
      ],
      [
        { itemKey: 'nettleSeed', requiredQuantity: 6 },
        { itemKey: 'nettleHerb', requiredQuantity: 3 },
        { itemKey: 'sageHerb', requiredQuantity: 4 },
        { itemKey: 'minorHealingPotion', requiredQuantity: 1 },
      ],
      [
        { itemKey: 'lavenderSeed', requiredQuantity: 8 },
        { itemKey: 'sageSeed', requiredQuantity: 8 },
        { itemKey: 'mintHerb', requiredQuantity: 5 },
        { itemKey: 'manaTonic', requiredQuantity: 2 },
      ],
      [
        { itemKey: 'mintSeed', requiredQuantity: 12 },
        { itemKey: 'briarSeed', requiredQuantity: 8 },
        { itemKey: 'lavenderHerb', requiredQuantity: 4 },
        { itemKey: 'nettleVigor', requiredQuantity: 2 },
      ],
      [
        { itemKey: 'lavenderSeed', requiredQuantity: 10 },
        { itemKey: 'briarHerb', requiredQuantity: 4 },
        { itemKey: 'nettleHerb', requiredQuantity: 6 },
        { itemKey: 'calmingDraught', requiredQuantity: 2 },
      ],
    ]);
  });

  it('keeps the level 10 onboarding row mixed but light', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(10).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level10-nettle-seeds', itemKey: 'nettleSeed', requiredQuantity: 12 },
      { id: 'level10-glowcap-seeds', itemKey: 'glowcapSeed', requiredQuantity: 8 },
      { id: 'level10-sage-herb', itemKey: 'sageHerb', requiredQuantity: 8 },
      { id: 'level10-briar-ward', itemKey: 'briarWard', requiredQuantity: 2 },
      {
        id: 'level10-minor-healing-potion',
        itemKey: 'minorHealingPotion',
        requiredQuantity: 3,
      },
    ]);
  });

  it('keeps level 11 as the first post-onboarding relief row', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(11).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level11-glowcap-seeds', itemKey: 'mintSeed', requiredQuantity: 69 },
      { id: 'level11-mandrake-seeds', itemKey: 'mandrakeHerb', requiredQuantity: 37 },
      { id: 'level11-mandrake-herb', itemKey: 'glowcapHerb', requiredQuantity: 25 },
      { id: 'level11-briar-ward', itemKey: 'manaTonic', requiredQuantity: 6 },
      { id: 'level11-calming-draught', itemKey: 'calmingDraught', requiredQuantity: 6 },
    ]);
  });

  it('keeps the level 19 ramp below the level 20 gate', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    expect(
      taskBalanceManager.getLevelTasks(19).map((task) => ({
        id: task.id,
        itemKey: task.itemKey,
        requiredQuantity: task.requiredQuantity,
      })),
    ).toEqual([
      { id: 'level19-moonflower-seeds', itemKey: 'moonflowerSeed', requiredQuantity: 114 },
      { id: 'level19-frostmoss-seeds', itemKey: 'sunrootHerb', requiredQuantity: 62 },
      { id: 'level19-frostmoss-herb', itemKey: 'frostmossHerb', requiredQuantity: 42 },
      { id: 'level19-healing-potion', itemKey: 'briarWard', requiredQuantity: 12 },
      { id: 'level19-venom-draught', itemKey: 'venomDraught', requiredQuantity: 8 },
    ]);
  });

  it('staggers the level 16 herb and recipe unlock requirements across two rows', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });
    const level16ItemKeys = taskBalanceManager.getLevelTasks(16).map((task) => task.itemKey);
    const level17ItemKeys = taskBalanceManager.getLevelTasks(17).map((task) => task.itemKey);

    expect(level16ItemKeys).toContain('moonflowerHerb');
    expect(level16ItemKeys).not.toContain('venomDraught');
    expect(level17ItemKeys).toContain('venomDraught');
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
      { itemKey: 'dreambellSeed', requiredQuantity: 1620 },
      { itemKey: 'starAniseHerb', requiredQuantity: 721 },
      { itemKey: 'dragonpepperHerb', requiredQuantity: 551 },
      { itemKey: 'elixirOfLife', requiredQuantity: 147 },
      { itemKey: 'pactWard', requiredQuantity: 111 },
    ]);
  });

  it('keeps ten-level stage bosses hard locally while later bosses rise globally', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });
    const levels = taskBalanceManager.getLevels();
    const levelByNumber = new Map(levels.map((level) => [level.level, level]));
    const bossLevels = [20, 30, 40, 50, 60, 70, 80, 90, 100];

    for (const bossLevel of bossLevels.slice(0, -1)) {
      const bossTotal = getRequiredQuantityTotal(levelByNumber.get(bossLevel));
      const nextOpenerTotal = getRequiredQuantityTotal(levelByNumber.get(bossLevel + 1));

      expect(bossTotal, `level ${bossLevel} boss should exceed next opener`).toBeGreaterThan(
        nextOpenerTotal,
      );
    }

    for (let index = 1; index < bossLevels.length; index += 1) {
      const previousBoss = getRequiredQuantityTotal(levelByNumber.get(bossLevels[index - 1]));
      const currentBoss = getRequiredQuantityTotal(levelByNumber.get(bossLevels[index]));

      expect(
        currentBoss,
        `level ${bossLevels[index]} boss should exceed previous stage boss`,
      ).toBeGreaterThan(previousBoss);
    }
  });

  it('does not repeat exact requirement items on adjacent post-onboarding levels', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });
    const levels = taskBalanceManager.getLevels();

    for (let index = 1; index < levels.length; index += 1) {
      const level = levels[index];

      if (level.level <= 10) {
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

  it('uses five tasks from the post-onboarding curve onward', () => {
    const taskBalanceManager = new TaskBalanceManager({ itemsFacade: new ItemsFacade() });

    for (const level of taskBalanceManager.getLevels()) {
      if (level.level <= 10) {
        continue;
      }

      expect(level.tasks, `config level ${level.level}`).toHaveLength(5);
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
      if (level.level <= 10) {
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

import { describe, expect, it } from 'vitest';

import { automationResearchIds } from '../../automation/automationResearchIds.js';
import { ItemsFacade } from '../../items/ItemsFacade.js';
import { ItemDefinitionManager } from '../../items/managers/ItemDefinitionManager.js';
import { advancedResearchIds } from '../advancedResearchIds.js';
import { automationReserveResearchIds } from '../automationReserveResearch.js';
import { emeraldResearchIds } from '../emeraldResearchIds.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { researchCostResearchIds } from '../researchCostResearch.js';
import { researchTimeResearchIds } from '../researchTimeResearch.js';
import { stallStaffingResearchIds } from '../stallStaffingResearch.js';
import { gardenBulkResearchIds } from '../../garden/gardenBulkResearch.js';
import { discoveredPotionResearchCostGoldByKey } from '../../../../spacetimedb/src/discoveredPotionResearch.ts';
import { itemTimerResearchIds } from '../itemTimerResearch.js';

describe('ResearchBalanceManager', () => {
  it('caps research durations at four hours', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsCoin: {
          shortStudy: 1,
          exactStudy: 2,
          longStudy: 3,
        },
        researchDurationsSeconds: {
          minimumStudy: 1,
          exactStudy: 14_400,
          longStudy: 14_401,
        },
      },
    });

    expect(manager.getDurationSeconds('minimumStudy')).toBe(5);
    expect(manager.getDurationSeconds('exactStudy')).toBe(14_400);
    expect(manager.getDurationSeconds('longStudy')).toBe(14_400);

    manager.setRuntimeConfigs([
      {
        researchId: 'minimumStudy',
        costCoin: 1,
        durationSeconds: 14_500,
        enabled: true,
      },
      {
        researchId: 'exactStudy',
        costCoin: 2,
        durationSeconds: 0,
        enabled: true,
      },
    ]);

    expect(manager.getDurationSeconds('minimumStudy')).toBe(14_400);
    expect(manager.getDurationSeconds('exactStudy')).toBe(0);
  });

  it('uses the default research time curve by currency and content type', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getDurationSeconds('automation:autoPlantTile:1')).toBe(5);
    expect(manager.getDurationSeconds(stallStaffingResearchIds.capacity(1))).toBe(5);
    expect(manager.getDurationSeconds(automationReserveResearchIds.controls(1))).toBe(5);
    expect(manager.getDurationSeconds(researchTimeResearchIds.reduction(1))).toBe(5);
    expect(manager.getDurationSeconds(researchCostResearchIds.reduction(1))).toBe(5);
    expect(manager.getDurationSeconds('emerald:plotPlanting:1:2')).toBe(5);
    expect(manager.getDurationSeconds('unlockSeed:sageSeed')).toBe(5);
    expect(manager.getDurationSeconds('unlockSeed:mintSeed')).toBe(60);
    expect(manager.getDurationSeconds('unlockSeed:glowcapSeed')).toBe(300);
    expect(manager.getDurationSeconds('unlockSeed:pearlrootSeed')).toBe(9_000);
    expect(manager.getDurationSeconds('unlockRecipe:manaTonic')).toBe(10);
    expect(manager.getDurationSeconds('unlockRecipe:briarWard')).toBe(300);
    expect(manager.getDurationSeconds('unlockRecipe:pearlrootDraught')).toBe(14_400);
    expect(manager.getDurationSeconds('unlockRecipe:ashenMemory')).toBe(0);
    expect(
      manager.getDurationSeconds(itemTimerResearchIds.herbGrowth('sageHerb', 1)),
    ).toBe(5);
    expect(
      manager.getCost(itemTimerResearchIds.herbGrowth('sageHerb', 2)),
    ).toEqual({ amount: 38, currency: 'coin' });
    expect(
      manager.getCost(itemTimerResearchIds.potionBrewing('manaTonic', 1)),
    ).toEqual({ amount: 50, currency: 'coin' });
    expect(manager.getCost('unlockRecipe:ashenMemory')).toEqual({
      amount: 102_400,
      currency: 'coin',
    });
    expect(manager.getDurationSeconds('summonSeedsX2')).toBe(600);
    expect(manager.getCost(gardenBulkResearchIds.plantAll)).toEqual({
      amount: 1_000,
      currency: 'coin',
    });
    expect(manager.getCost(gardenBulkResearchIds.harvestAll)).toEqual({
      amount: 10_000,
      currency: 'coin',
    });
    expect(manager.getDurationSeconds(gardenBulkResearchIds.plantAll)).toBe(600);
    expect(manager.getDurationSeconds(gardenBulkResearchIds.harvestAll)).toBe(600);
    expect(manager.getCost(researchTimeResearchIds.reduction(8))).toEqual({
      amount: 8,
      currency: 'emerald',
    });
    expect(manager.getCost(researchCostResearchIds.reduction(8))).toEqual({
      amount: 8,
      currency: 'emerald',
    });
    expect(manager.getCost(automationReserveResearchIds.controls(3))).toEqual({
      amount: 3,
      currency: 'emerald',
    });
    expect(manager.getCost(automationResearchIds.autoPlantTile(11))).toEqual({
      amount: 11,
      currency: 'ruby',
    });
    expect(manager.getCost(automationResearchIds.autoBrewCauldron(5))).toEqual({
      amount: 5,
      currency: 'ruby',
    });
    expect(manager.getCost(advancedResearchIds.plotGrowth(12, 1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
    expect(manager.getCost(advancedResearchIds.cauldronBrewing(5, 1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
  });

  it('applies research cost reduction to coin research costs', () => {
    const manager = new ResearchBalanceManager();

    expect(
      manager.getCost('unlockSeed:mintSeed', { researchCostReductionLevel: 1 }),
    ).toEqual({
      amount: 0,
      currency: 'coin',
    });
    expect(
      manager.getCost('unlockRecipe:minorHealingPotion', {
        researchCostReductionLevel: 1,
      }),
    ).toEqual({
      amount: 360,
      currency: 'coin',
    });
    expect(
      manager.getCost('unlockRecipe:manaTonic', { researchCostReductionLevel: 8 }),
    ).toEqual({
      amount: 0,
      currency: 'coin',
    });
    expect(
      manager.getCost(researchCostResearchIds.reduction(2), {
        researchCostReductionLevel: 1,
      }),
    ).toEqual({
      amount: 2,
      currency: 'emerald',
    });
  });

  it('makes every post-onboarding seed and potion unlock a compounding milestone', () => {
    const research = new ResearchBalanceManager();
    const items = new ItemDefinitionManager();
    const seeds = items.getSeedDefinitions();
    const recipeUnlockOrder = [
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
    const expectedRecipeCosts = [
      400, 700, 1_200, 2_100, 3_800, 6_600, 11_000, 20_000, 35_000, 62_000,
      110_000, 190_000, 330_000, 580_000, 1_000_000, 1_800_000, 3_100_000,
      5_400_000, 9_500_000, 17_000_000, 29_000_000, 51_000_000, 89_000_000,
      160_000_000, 270_000_000, 480_000_000, 830_000_000,
    ];

    expect(research.getCost('unlockSeed:sageSeed').amount).toBe(0);
    expect(research.getCost('unlockSeed:mintSeed').amount).toBe(0);

    for (const seed of seeds.slice(2)) {
      expect(research.getCost(`unlockSeed:${seed.key}`).amount).toBe(
        seed.baseSellPrice * 100,
      );
    }

    expect(research.getCost('unlockRecipe:manaTonic').amount).toBe(0);
    const recipeCosts = recipeUnlockOrder.map(
      (potionKey) => research.getCost(`unlockRecipe:${potionKey}`).amount,
    );
    expect(recipeCosts).toEqual(expectedRecipeCosts);
    expect(
      recipeCosts.every((cost, index) => index === 0 || cost > recipeCosts[index - 1]),
    ).toBe(true);
    expect(research.getCost('unlockSeed:pearlrootSeed').amount).toBeLessThan(
      1_000_000_000,
    );
    expect(recipeCosts.at(-1)).toBeLessThan(1_000_000_000);

    expect(
      ['summonSeedsX2', 'summonSeedsX3', 'summonSeedsX4', 'summonSeedsX5'].map(
        (researchId) => research.getCost(researchId).amount,
      ),
    ).toEqual([1_000, 10_000, 100_000, 1_000_000]);
  });

  it('prices discovered recipes at twice their latest ingredient seed research', () => {
    const research = new ResearchBalanceManager();
    const items = new ItemsFacade();

    for (const potion of items.getUnknownPotionDefinitions()) {
      const recipe = items.getPotionRecipe(potion.key);
      const latestIngredientSeedCost = Math.max(
        ...recipe.ingredients.map((ingredient) => {
          const seedKey = ingredient.key.replace(/Herb$/, 'Seed');
          return research.getCost(`unlockSeed:${seedKey}`).amount;
        }),
      );

      expect(research.getCost(`unlockRecipe:${potion.key}`)).toEqual({
        amount: latestIngredientSeedCost * 2,
        currency: 'coin',
      });
      expect(research.getCost(`unlockRecipe:${potion.key}`).amount).toBe(
        Number(discoveredPotionResearchCostGoldByKey[potion.key]),
      );
      expect(research.getDurationSeconds(`unlockRecipe:${potion.key}`)).toBe(0);
    }
  });

  it('reads crystal multiplier costs from balance', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsCoin: {},
        researchCostsCrystal: {
          'emerald:plotPlanting:2:2': 2,
        },
      },
    });

    expect(manager.getCost('emerald:plotPlanting:2:2')).toEqual({
      amount: 2,
      currency: 'crystal',
    });
    expect(manager.getCostCrystal('emerald:plotPlanting:2:2')).toBe(2);
  });

  it('prices crystal level-ups by upgrade level, not slot number', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getCostCrystal('emerald:plotPlanting:1:2')).toBe(2);
    expect(manager.getCostCrystal('emerald:plotPlanting:10:2')).toBe(2);
    expect(manager.getCostCrystal(emeraldResearchIds.plotPlanting(12, 2))).toBe(2);
    expect(manager.getCostCrystal('emerald:plotPlanting:10:3')).toBe(4);
    expect(manager.getCostCrystal('emerald:plotPlanting:10:4')).toBe(8);
    expect(manager.getCostCrystal('emerald:plotPlanting:10:5')).toBe(16);
    expect(manager.getCostCrystal('emerald:cauldronBrewing:5:2')).toBe(2);
    expect(manager.getCostCrystal(emeraldResearchIds.cauldronBrewing(5, 2))).toBe(2);
    expect(manager.getCostCrystal('emerald:cauldronBrewing:5:3')).toBe(4);
  });

  it('moves legacy crystal automation costs into ruby', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsCoin: {
          [automationResearchIds.autoPlantTile(11)]: 99,
        },
        researchCostsCrystal: {},
      },
    });

    expect(manager.getCost(automationResearchIds.autoPlantTile(11))).toEqual({
      amount: 11,
      currency: 'ruby',
    });
  });

  it('prices auto seed spawn at 2 ruby', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getCost(automationResearchIds.autoSeedSpawn())).toEqual({
      amount: 2,
      currency: 'ruby',
    });
  });

  it('moves legacy ruby advanced costs into emerald', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsCoin: {},
        researchCostsRuby: {
          [researchTimeResearchIds.reduction(1)]: 99,
        },
      },
    });

    expect(manager.getCost(researchTimeResearchIds.reduction(1))).toEqual({
      amount: 99,
      currency: 'emerald',
    });
  });

  it('keeps emerald research costs specific to advanced lanes', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getCost(stallStaffingResearchIds.capacity(1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
    expect(manager.getCost('advanced:plotCapacity:6')).toEqual({
      amount: 1,
      currency: 'emerald',
    });
    expect(manager.getCost(automationReserveResearchIds.controls(1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
    expect(manager.getCost(researchTimeResearchIds.reduction(1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
    expect(manager.getCost(advancedResearchIds.plotGrowth(1, 1))).toEqual({
      amount: 1,
      currency: 'emerald',
    });
  });
});

import { describe, expect, it } from 'vitest';

import { automationResearchIds } from '../../automation/automationResearchIds.js';
import { advancedResearchIds } from '../advancedResearchIds.js';
import { emeraldResearchIds } from '../emeraldResearchIds.js';
import { ResearchBalanceManager } from './ResearchBalanceManager.js';
import { researchCostResearchIds } from '../researchCostResearch.js';
import { researchTimeResearchIds } from '../researchTimeResearch.js';

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
          shortStudy: 30,
          exactStudy: 14_400,
          longStudy: 14_401,
        },
      },
    });

    expect(manager.getDurationSeconds('shortStudy')).toBe(30);
    expect(manager.getDurationSeconds('exactStudy')).toBe(14_400);
    expect(manager.getDurationSeconds('longStudy')).toBe(14_400);

    manager.setRuntimeConfigs([
      {
        researchId: 'shortStudy',
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

    expect(manager.getDurationSeconds('shortStudy')).toBe(14_400);
    expect(manager.getDurationSeconds('exactStudy')).toBe(0);
  });

  it('uses the default research time curve by currency and content type', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getDurationSeconds('automation:autoPlantTile:1')).toBe(3);
    expect(manager.getDurationSeconds('fastSellPayout:1')).toBe(3);
    expect(manager.getDurationSeconds(researchTimeResearchIds.reduction(1))).toBe(3);
    expect(manager.getDurationSeconds(researchCostResearchIds.reduction(1))).toBe(3);
    expect(manager.getDurationSeconds('emerald:plotPlanting:1:2')).toBe(3);
    expect(manager.getDurationSeconds('unlockSeed:sageSeed')).toBe(3);
    expect(manager.getDurationSeconds('unlockSeed:mintSeed')).toBe(60);
    expect(manager.getDurationSeconds('unlockSeed:glowcapSeed')).toBe(300);
    expect(manager.getDurationSeconds('unlockSeed:pearlrootSeed')).toBe(9_000);
    expect(manager.getDurationSeconds('unlockRecipe:manaTonic')).toBe(10);
    expect(manager.getDurationSeconds('unlockRecipe:briarWard')).toBe(300);
    expect(manager.getDurationSeconds('unlockRecipe:pearlrootDraught')).toBe(14_400);
    expect(manager.getDurationSeconds('summonSeedsX2')).toBe(600);
    expect(manager.getCost(researchTimeResearchIds.reduction(8))).toEqual({
      amount: 8,
      currency: 'ruby',
    });
    expect(manager.getCost(researchCostResearchIds.reduction(8))).toEqual({
      amount: 8,
      currency: 'ruby',
    });
    expect(manager.getCost(automationResearchIds.autoPlantTile(11))).toEqual({
      amount: 11,
      currency: 'crystal',
    });
    expect(manager.getCost(automationResearchIds.autoHarvestPlant(12))).toEqual({
      amount: 12,
      currency: 'crystal',
    });
    expect(manager.getCost(automationResearchIds.autoBrewCauldron(5))).toEqual({
      amount: 5,
      currency: 'crystal',
    });
    expect(manager.getCost(automationResearchIds.autoBottleCauldron(5))).toEqual({
      amount: 5,
      currency: 'crystal',
    });
    expect(manager.getCost(advancedResearchIds.plotGrowth(12, 1))).toEqual({
      amount: 1,
      currency: 'ruby',
    });
    expect(manager.getCost(advancedResearchIds.cauldronBrewing(5, 1))).toEqual({
      amount: 1,
      currency: 'ruby',
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
      amount: 54,
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
      currency: 'ruby',
    });
  });

  it('reads emerald research costs from balance', () => {
    const manager = new ResearchBalanceManager({
      balance: {
        researchCostsCoin: {},
        researchCostsEmerald: {
          'emerald:plotPlanting:2:2': 2,
        },
      },
    });

    expect(manager.getCost('emerald:plotPlanting:2:2')).toEqual({
      amount: 2,
      currency: 'emerald',
    });
    expect(manager.getCostEmerald('emerald:plotPlanting:2:2')).toBe(2);
  });

  it('prices emerald level-ups by upgrade level, not slot number', () => {
    const manager = new ResearchBalanceManager();

    expect(manager.getCostEmerald('emerald:plotPlanting:1:2')).toBe(1);
    expect(manager.getCostEmerald('emerald:plotPlanting:10:2')).toBe(1);
    expect(manager.getCostEmerald(emeraldResearchIds.plotPlanting(12, 2))).toBe(1);
    expect(manager.getCostEmerald('emerald:plotPlanting:10:3')).toBe(2);
    expect(manager.getCostEmerald('emerald:cauldronBrewing:5:2')).toBe(1);
    expect(manager.getCostEmerald(emeraldResearchIds.cauldronBrewing(5, 2))).toBe(1);
    expect(manager.getCostEmerald('emerald:cauldronBrewing:5:3')).toBe(2);
  });

  it('fills missing crystal costs from defaults for old runtime configs', () => {
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
      currency: 'crystal',
    });
  });

  it('reads ruby research costs for research time reduction', () => {
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
      currency: 'ruby',
    });
  });
});

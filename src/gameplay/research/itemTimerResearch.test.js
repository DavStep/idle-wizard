import { describe, expect, it } from 'vitest';

import {
  applyItemTimerResearchReduction,
  createItemTimerResearchCosts,
  getItemTimerConfiguredPercent,
  getItemTimerResearchDurationSeconds,
  getItemTimerResearchMaxLevel,
  itemTimerResearchIds,
} from './itemTimerResearch.js';
import {
  getItemTimerResearchDurationSeconds as getBackendItemTimerResearchDurationSeconds,
  getItemTimerResearchMaxLevel as getBackendItemTimerResearchMaxLevel,
  isLegacyItemTimerResearchDuration,
} from '../../../spacetimedb/src/itemTimerResearch.ts';

describe('itemTimerResearch', () => {
  it('gives every herb and potion timer mastery nineteen ranks', () => {
    expect([0, 1, 2, 3, 4, 5].map(getItemTimerResearchMaxLevel)).toEqual([
      19, 19, 19, 19, 19, 19,
    ]);
    expect([0, 1, 2, 3, 4, 5].map(getItemTimerConfiguredPercent)).toEqual([
      185, 185, 185, 185, 185, 185,
    ]);
    expect(getBackendItemTimerResearchMaxLevel()).toBe(19);
  });

  it('applies all nineteen timer reductions to starter and later items', () => {
    expect(applyItemTimerResearchReduction(12_000, 0, 19)).toBe(12_000);
    expect(applyItemTimerResearchReduction(12_000, 19, 19)).toBe(5_838);
    expect(applyItemTimerResearchReduction(111_000, 17, 19)).toBe(60_000);
    expect(applyItemTimerResearchReduction(111_000, 19, 19)).toBe(54_000);
  });

  it('scales study time from the matching production timer and mastery rank', () => {
    const cases = [
      [12_000, 1, 12],
      [12_000, 2, 24],
      [27_500, 1, 28],
      [27_500, 4, 110],
      [30_000, 2, 60],
      [962_000, 19, 18_278],
    ];

    for (const [configuredDurationMs, level, expectedSeconds] of cases) {
      expect(
        getItemTimerResearchDurationSeconds(configuredDurationMs, level),
      ).toBe(expectedSeconds);
      expect(
        getBackendItemTimerResearchDurationSeconds(configuredDurationMs, level),
      ).toBe(expectedSeconds);
    }
  });

  it('identifies only the old flat timer rows for backend migration', () => {
    expect(isLegacyItemTimerResearchDuration(
      itemTimerResearchIds.herbGrowth('sageHerb', 1),
      5n,
    )).toBe(true);
    expect(isLegacyItemTimerResearchDuration('unlockSeed:sageSeed', 5n)).toBe(false);
    expect(isLegacyItemTimerResearchDuration(
      itemTimerResearchIds.herbGrowth('sageHerb', 1),
      12n,
    )).toBe(false);
  });

  it('uses cheap starter bases and a direct exponential rank curve', () => {
    const costs = createItemTimerResearchCosts({
      seedUnlockCosts: {
        'unlockSeed:sageSeed': 0,
        'unlockSeed:mintSeed': 0,
        'unlockSeed:nettleSeed': 400,
      },
      recipeUnlockCosts: {
        'unlockRecipe:manaTonic': 0,
        'unlockRecipe:minorHealingPotion': 400,
      },
    });

    expect(costs[itemTimerResearchIds.herbGrowth('sageHerb', 1)]).toBe(25);
    expect(costs[itemTimerResearchIds.herbGrowth('sageHerb', 2)]).toBe(38);
    expect(costs[itemTimerResearchIds.herbGrowth('sageHerb', 19)]).toBe(36_947);
    expect(costs[itemTimerResearchIds.herbGrowth('nettleHerb', 7)]).toBe(4_556);
    expect(costs[itemTimerResearchIds.potionBrewing('manaTonic', 1)]).toBe(50);
    expect(costs[itemTimerResearchIds.potionBrewing('minorHealingPotion', 4)]).toBe(1_350);
    expect(costs[itemTimerResearchIds.potionBrewing('manaTonic', 19)]).toBe(73_895);
  });
});

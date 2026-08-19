import { describe, expect, it } from 'vitest';

import {
  applyItemTimerResearchReduction,
  createItemTimerResearchCosts,
  getItemTimerConfiguredPercent,
  getItemTimerResearchMaxLevel,
  itemTimerResearchIds,
} from './itemTimerResearch.js';

describe('itemTimerResearch', () => {
  it('keeps starter timers gentle and reserves nineteen ranks for later items', () => {
    expect([0, 1, 2, 3, 4, 5].map(getItemTimerResearchMaxLevel)).toEqual([
      2, 4, 7, 10, 14, 19,
    ]);
    expect([0, 1, 2, 3, 4, 5].map(getItemTimerConfiguredPercent)).toEqual([
      100, 110, 125, 140, 160, 185,
    ]);
  });

  it('ends every item ten percent faster than its former timer', () => {
    expect(applyItemTimerResearchReduction(12_000, 0, 2)).toBe(12_000);
    expect(applyItemTimerResearchReduction(12_000, 2, 2)).toBe(10_800);
    expect(applyItemTimerResearchReduction(111_000, 17, 19)).toBe(60_000);
    expect(applyItemTimerResearchReduction(111_000, 19, 19)).toBe(54_000);
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
    expect(costs[itemTimerResearchIds.herbGrowth('nettleHerb', 7)]).toBe(4_556);
    expect(costs[itemTimerResearchIds.potionBrewing('manaTonic', 1)]).toBe(50);
    expect(costs[itemTimerResearchIds.potionBrewing('minorHealingPotion', 4)]).toBe(1_350);
  });
});

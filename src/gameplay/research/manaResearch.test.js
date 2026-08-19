import { describe, expect, it } from 'vitest';

import {
  createManaResearchCostsCoin,
  getManaCapacityResearchCostCoin,
  getManaGenerationResearchCostCoin,
  getManaGenerationThroughPlayerLevel,
  manaResearchIds,
} from './manaResearch.js';

describe('manaResearch', () => {
  it('starts affordably and reaches the intended level 17 prices', () => {
    expect(getManaCapacityResearchCostCoin(2)).toBe(25);
    expect(getManaGenerationResearchCostCoin(2)).toBe(50);
    expect(getManaCapacityResearchCostCoin(17)).toBe(30_000);
    expect(getManaGenerationResearchCostCoin(17)).toBe(45_000);
  });

  it('gets strictly more expensive through the uncapped progression curve', () => {
    for (let playerLevel = 3; playerLevel <= 100; playerLevel += 1) {
      expect(getManaCapacityResearchCostCoin(playerLevel)).toBeGreaterThan(
        getManaCapacityResearchCostCoin(playerLevel - 1),
      );
      expect(getManaGenerationResearchCostCoin(playerLevel)).toBeGreaterThan(
        getManaGenerationResearchCostCoin(playerLevel - 1),
      );
    }
  });

  it('reproduces the former level-based generation curve when every rank is complete', () => {
    expect(getManaGenerationThroughPlayerLevel(1)).toBe(1);
    expect(getManaGenerationThroughPlayerLevel(5)).toBe(5);
    expect(getManaGenerationThroughPlayerLevel(10)).toBe(7.5);
    expect(getManaGenerationThroughPlayerLevel(17)).toBe(9.25);
    expect(getManaGenerationThroughPlayerLevel(100)).toBe(30);
  });

  it('generates costs for both sequential lanes through player level 100', () => {
    const costs = createManaResearchCostsCoin();

    expect(Object.keys(costs)).toHaveLength(198);
    expect(costs[manaResearchIds.capacity(17)]).toBe(30_000);
    expect(costs[manaResearchIds.generation(17)]).toBe(45_000);
    expect(costs[manaResearchIds.capacity(100)]).toBe(700_000_000);
    expect(costs[manaResearchIds.generation(100)]).toBe(1_000_000_000);
  });
});

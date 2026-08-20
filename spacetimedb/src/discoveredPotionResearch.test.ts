import { describe, expect, it } from 'vitest';

import {
  createDiscoveredPotionResearchCatalog,
  discoveredPotionResearchCostGoldByKey,
  discoveredPotionResearchDurationSecondsByKey,
} from './discoveredPotionResearch';

describe('discovered potion research catalog', () => {
  it('creates persistent independent research rows with progression-priced costs', () => {
    const catalog = createDiscoveredPotionResearchCatalog([
      { key: 'ashenMemory', label: 'ashen memory' },
      { key: 'silverleafQuiet', label: 'silverleaf quiet' },
    ]);

    expect(catalog).toEqual([
      {
        researchId: 'unlockRecipe:ashenMemory',
        label: 'ashen memory',
        groupId: 'recipeUnlocks',
        defaultCostGold: 102_400n,
      },
      {
        researchId: 'unlockRecipe:silverleafQuiet',
        label: 'silverleaf quiet',
        groupId: 'recipeUnlocks',
        defaultCostGold: 51_200n,
      },
    ]);
    expect(Object.keys(discoveredPotionResearchCostGoldByKey)).toHaveLength(10);
    expect(discoveredPotionResearchDurationSecondsByKey).toEqual(
      Object.fromEntries(
        Object.keys(discoveredPotionResearchCostGoldByKey).map((potionKey) => [
          potionKey,
          600n,
        ]),
      ),
    );
  });

});

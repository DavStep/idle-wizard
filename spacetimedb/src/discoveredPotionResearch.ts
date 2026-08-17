type DiscoveredPotion = {
  key: string;
  label: string;
};

export const discoveredPotionResearchCostGoldByKey: Record<string, bigint> = {
  ashenMemory: 102_400n,
  silverleafQuiet: 51_200n,
  emberSight: 1_638_400n,
  thornSleep: 204_800n,
  glassMoonElixir: 409_600n,
  rootboundResolve: 25_600n,
  nightOrchardTonic: 819_200n,
  starlessCourage: 1_638_400n,
  frostveinDraught: 102_400n,
  bloodlightWard: 819_200n,
};

export function createDiscoveredPotionResearchCatalog(
  potions: DiscoveredPotion[],
) {
  return potions.map((potion) => {
    const defaultCostGold = discoveredPotionResearchCostGoldByKey[potion.key];

    if (defaultCostGold === undefined) {
      throw new Error(`Missing discovered potion research cost: ${potion.key}`);
    }

    return {
      researchId: `unlockRecipe:${potion.key}`,
      label: potion.label,
      groupId: 'recipeUnlocks',
      defaultCostGold,
    };
  });
}

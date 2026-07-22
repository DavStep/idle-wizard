export const automationResearchIds = Object.freeze({
  autoSeedSpawn: () => 'automation:autoSeedSpawn',
  autoPlantTile: (tileNumber) => `automation:autoPlantTile:${tileNumber}`,
  autoHarvestPlant: (tileNumber) => `automation:autoHarvestPlant:${tileNumber}`,
  autoBrewCauldron: (cauldronNumber) => `automation:autoBrewCauldron:${cauldronNumber}`,
  autoBottleCauldron: (cauldronNumber) =>
    `automation:autoBottleCauldron:${cauldronNumber}`,
});

export function migrateLegacySplitAutomationResearchId(researchId) {
  const value = String(researchId ?? '');
  const harvestMatch = /^automation:autoHarvestPlant:(\d+)$/.exec(value);

  if (harvestMatch) {
    return automationResearchIds.autoPlantTile(Number(harvestMatch[1]));
  }

  const bottleMatch = /^automation:autoBottleCauldron:(\d+)$/.exec(value);
  return bottleMatch
    ? automationResearchIds.autoBrewCauldron(Number(bottleMatch[1]))
    : researchId;
}

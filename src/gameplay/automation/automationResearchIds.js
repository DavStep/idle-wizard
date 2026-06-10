export const automationResearchIds = Object.freeze({
  autoSeedSpawn: () => 'automation:autoSeedSpawn',
  autoPlantTile: (tileNumber) => `automation:autoPlantTile:${tileNumber}`,
  autoHarvestPlant: (tileNumber) => `automation:autoHarvestPlant:${tileNumber}`,
  autoBrewCauldron: (cauldronNumber) => `automation:autoBrewCauldron:${cauldronNumber}`,
  autoBottleCauldron: (cauldronNumber) =>
    `automation:autoBottleCauldron:${cauldronNumber}`,
  autoCollectCauldron: (cauldronNumber) =>
    `automation:autoCollectCauldron:${cauldronNumber}`,
});

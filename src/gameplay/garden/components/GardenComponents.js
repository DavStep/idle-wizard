export const gardenTilePhases = Object.freeze({
  empty: 0,
  growing: 1,
  ready: 2,
  harvesting: 3,
});

export const gardenTilePhaseNames = Object.freeze([
  'empty',
  'growing',
  'ready',
  'harvesting',
]);

export const GardenTile = {
  tileNumber: [],
  isUnlocked: [],
  selectedSeedItemTypeId: [],
  seedItemTypeId: [],
  herbItemTypeId: [],
  harvestQuantity: [],
  phase: [],
  totalSeconds: [],
  remainingSeconds: [],
};

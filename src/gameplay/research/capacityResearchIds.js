export const plotCapacityStartPlotNumber = 11;
export const plotCapacityEndPlotNumber = 20;
export const cauldronCapacityStartCauldronNumber = 6;
export const cauldronCapacityEndCauldronNumber = 10;

export const capacityResearchIds = Object.freeze({
  plot: (plotNumber) => `advanced:plotCapacity:${plotNumber}`,
  cauldron: (cauldronNumber) => `advanced:cauldronCapacity:${cauldronNumber}`,
});

export function getPlotCapacityPrestigeRequirement(plotNumber) {
  return plotNumber - 10;
}

export function getCauldronCapacityPrestigeRequirement(cauldronNumber) {
  return (cauldronNumber - 5) * 2;
}

export function isCapacityResearchId(researchId) {
  return (
    typeof researchId === 'string' &&
    (researchId.startsWith('advanced:plotCapacity:') ||
      researchId.startsWith('advanced:cauldronCapacity:'))
  );
}

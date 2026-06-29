export const plotCapacityStartPlotNumber = 6;
export const plotCapacityEndPlotNumber = 12;
export const cauldronCapacityStartCauldronNumber = 3;
export const cauldronCapacityEndCauldronNumber = 5;

export const capacityResearchIds = Object.freeze({
  plot: (plotNumber) => `advanced:plotCapacity:${plotNumber}`,
  cauldron: (cauldronNumber) => `advanced:cauldronCapacity:${cauldronNumber}`,
});

export function getPlotCapacityPrestigeRequirement(plotNumber) {
  return plotNumber - 5;
}

export function getCauldronCapacityPrestigeRequirement(cauldronNumber) {
  return cauldronNumber - 2;
}

export function isCapacityResearchId(researchId) {
  return (
    typeof researchId === 'string' &&
    (researchId.startsWith('advanced:plotCapacity:') ||
      researchId.startsWith('advanced:cauldronCapacity:'))
  );
}

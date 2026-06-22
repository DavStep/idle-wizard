export const researchCostResearchMaxLevel = 8;
export const researchCostResearchStepPercent = 10;

export const researchCostResearchIds = Object.freeze({
  reduction: (level) => `emerald:researchCost:${level}`,
});

export function getResearchCostReductionPercent(level = 0) {
  const safeLevel = Math.max(
    0,
    Math.min(researchCostResearchMaxLevel, Math.floor(Number(level) || 0)),
  );

  return safeLevel * researchCostResearchStepPercent;
}

export function getResearchCostMultiplier(level = 0) {
  const reduction = getResearchCostReductionPercent(level) / 100;

  return Math.max(0.2, 1 - reduction);
}

export function applyResearchCostReductionAmount(amount, level = 0) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));

  if (safeAmount <= 0) {
    return 0;
  }

  return Math.max(1, Math.floor(safeAmount * getResearchCostMultiplier(level)));
}

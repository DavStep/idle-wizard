export const researchTimeResearchMaxLevel = 8;
export const researchTimeResearchStepPercent = 10;

export const researchTimeResearchIds = Object.freeze({
  reduction: (level) => `advanced:researchTime:${level}`,
});

export function getResearchTimeReductionPercent(level = 0) {
  const safeLevel = Math.max(
    0,
    Math.min(researchTimeResearchMaxLevel, Math.floor(Number(level) || 0)),
  );

  return safeLevel * researchTimeResearchStepPercent;
}

export function getResearchTimeMultiplier(level = 0) {
  const reduction = getResearchTimeReductionPercent(level) / 100;

  return Math.max(0.2, 1 - reduction);
}

export function applyResearchTimeReductionSeconds(durationSeconds, level = 0) {
  const safeDurationSeconds = Math.max(0, Number(durationSeconds) || 0);

  if (safeDurationSeconds <= 0) {
    return 0;
  }

  const reducedDurationSeconds = safeDurationSeconds * getResearchTimeMultiplier(level);

  return Math.max(1, Math.round(reducedDurationSeconds * 1000) / 1000);
}

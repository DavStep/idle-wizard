export const advancedResearchMaxLevel = 12;
export const advancedResearchMinTimeMultiplier = 0.1;

export const advancedResearchIds = Object.freeze({
  cauldronBrewing: (cauldronNumber, level) =>
    `advanced:cauldronBrewing:${cauldronNumber}:${level}`,
  plotGrowth: (plotNumber, level) => `advanced:plotGrowth:${plotNumber}:${level}`,
  stallStaffing: (stallNumber) => `advanced:stallStaffing:${stallNumber}`,
});

export function getAdvancedResearchLevelReductionPercent() {
  return 5;
}

export function getAdvancedResearchTotalReductionPercent(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));

  return Array.from({ length: safeLevel }, (_value, index) =>
    getAdvancedResearchLevelReductionPercent(index + 1),
  ).reduce((total, percent) => total + percent, 0);
}

export function getAdvancedResearchTimeMultiplier(level) {
  const totalReduction = getAdvancedResearchTotalReductionPercent(level) / 100;
  return Math.max(advancedResearchMinTimeMultiplier, 1 - totalReduction);
}

export function applyAdvancedResearchTimeReduction(durationMs, level) {
  const safeDurationMs = Math.max(0, Number(durationMs) || 0);
  const reducedDurationMs = safeDurationMs * getAdvancedResearchTimeMultiplier(level);

  return safeDurationMs <= 0 ? 0 : Math.max(1_000, Math.round(reducedDurationMs));
}

export function getCompletedAdvancedResearchLevel({
  completedResearchIds = [],
  getId,
  targetNumber,
}) {
  const completedIds = new Set(completedResearchIds);
  let completedLevel = 0;

  for (let level = 1; level <= advancedResearchMaxLevel; level += 1) {
    if (!completedIds.has(getId(targetNumber, level))) {
      break;
    }

    completedLevel = level;
  }

  return completedLevel;
}

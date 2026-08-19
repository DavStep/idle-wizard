export const itemTimerResearchStepPercent = 5;
export const itemTimerResearchFinalPercentOfOriginal = 90;
export const itemTimerResearchLateGameMaxLevel = 19;
export const itemTimerResearchDurationSeconds = 5;

const earlyMaxLevels = Object.freeze([2, 4, 7, 10, 14]);

export const itemTimerResearchIds = Object.freeze({
  herbGrowth: (herbKey, level) => `timer:herbGrowth:${herbKey}:${level}`,
  potionBrewing: (potionKey, level) =>
    `timer:potionBrewing:${potionKey}:${level}`,
});

export function getItemTimerResearchMaxLevel(catalogIndex) {
  const safeIndex = Math.max(0, Math.floor(Number(catalogIndex) || 0));
  return earlyMaxLevels[safeIndex] ?? itemTimerResearchLateGameMaxLevel;
}

export function getItemTimerConfiguredPercent(catalogIndex) {
  return (
    itemTimerResearchFinalPercentOfOriginal +
    itemTimerResearchStepPercent * getItemTimerResearchMaxLevel(catalogIndex)
  );
}

export function applyItemTimerResearchReduction(
  configuredDurationMs,
  completedLevel,
  maxLevel,
) {
  const safeDurationMs = Math.max(0, Number(configuredDurationMs) || 0);
  if (safeDurationMs <= 0) {
    return 0;
  }

  const safeMaxLevel = Math.max(0, Math.floor(Number(maxLevel) || 0));
  const safeCompletedLevel = Math.max(
    0,
    Math.min(safeMaxLevel, Math.floor(Number(completedLevel) || 0)),
  );
  const configuredPercent =
    itemTimerResearchFinalPercentOfOriginal +
    itemTimerResearchStepPercent * safeMaxLevel;
  const remainingPercent =
    configuredPercent - itemTimerResearchStepPercent * safeCompletedLevel;

  return Math.max(
    1_000,
    Math.round(safeDurationMs * (remainingPercent / configuredPercent)),
  );
}

export function getItemTimerResearchCost(baseCost, level) {
  const safeBaseCost = Math.max(0, Math.floor(Number(baseCost) || 0));
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.round(safeBaseCost * 1.5 ** (safeLevel - 1));
}

export function createItemTimerResearchCosts({ seedUnlockCosts, recipeUnlockCosts }) {
  return {
    ...createResearchSeriesCosts({
      unlockCosts: seedUnlockCosts,
      unlockPrefix: 'unlockSeed:',
      getItemKey: (unlockKey) => `${unlockKey.slice(0, -'Seed'.length)}Herb`,
      getId: itemTimerResearchIds.herbGrowth,
      starterBaseCosts: { sageSeed: 25, mintSeed: 50 },
    }),
    ...createResearchSeriesCosts({
      unlockCosts: recipeUnlockCosts,
      unlockPrefix: 'unlockRecipe:',
      getItemKey: (unlockKey) => unlockKey,
      getId: itemTimerResearchIds.potionBrewing,
      starterBaseCosts: { manaTonic: 50 },
    }),
  };
}

export function isItemTimerResearchId(researchId) {
  return /^timer:(?:herbGrowth|potionBrewing):[^:]+:\d+$/.test(
    String(researchId ?? ''),
  );
}

function createResearchSeriesCosts({
  unlockCosts,
  unlockPrefix,
  getItemKey,
  getId,
  starterBaseCosts,
}) {
  const unlockEntries = Object.entries(unlockCosts ?? {}).filter(([researchId]) =>
    researchId.startsWith(unlockPrefix),
  );
  const costs = {};

  unlockEntries.forEach(([researchId, unlockCost], catalogIndex) => {
    const unlockKey = researchId.slice(unlockPrefix.length);
    const itemKey = getItemKey(unlockKey);
    const baseCost = starterBaseCosts[unlockKey] ?? unlockCost;
    const maxLevel = getItemTimerResearchMaxLevel(catalogIndex);

    for (let level = 1; level <= maxLevel; level += 1) {
      costs[getId(itemKey, level)] = getItemTimerResearchCost(baseCost, level);
    }
  });

  return costs;
}

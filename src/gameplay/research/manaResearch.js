export const manaResearchFirstPlayerLevel = 2;
export const manaResearchMaxPlayerLevel = 100;
export const legacyManaResearchDurationSeconds = 5;

const manaResearchDurationTargets = Object.freeze([
  { playerLevel: 2, durationSeconds: 5 },
  { playerLevel: 17, durationSeconds: 30 * 60 },
  { playerLevel: 44, durationSeconds: 2 * 60 * 60 },
  { playerLevel: 100, durationSeconds: 4 * 60 * 60 },
]);

export const manaResearchSeriesIds = {
  capacity: 'manaSphereCap',
  generation: 'manaProductionRate',
};

export const manaResearchIds = {
  capacity: (playerLevel) =>
    `${manaResearchSeriesIds.capacity}:${getManaResearchRank(playerLevel)}`,
  generation: (playerLevel) =>
    `${manaResearchSeriesIds.generation}:${getManaResearchRank(playerLevel)}`,
};

const earlyCostTargetPlayerLevel = 17;
const midCostTargetPlayerLevel = 44;
const maximumCostCoin = 1_000_000_000;
const capacityBaseCostCoin = 25;
const generationBaseCostCoin = 50;
const capacityLevel17CostCoin = 30_000;
const generationLevel17CostCoin = 45_000;
const capacityLevel44CostCoin = 6_000_000;
const generationLevel44CostCoin = 9_000_000;
const capacityLevel100CostCoin = 700_000_000;
const generationLevel100CostCoin = 1_000_000_000;

export function getManaResearchRank(playerLevel) {
  return Math.max(
    1,
    normalizePlayerLevel(playerLevel) - manaResearchFirstPlayerLevel + 1,
  );
}

export function getManaResearchPlayerLevel(researchId, seriesId) {
  const match = new RegExp(`^${seriesId}:(\\d+)$`).exec(
    String(researchId ?? ''),
  );
  const rank = Number(match?.[1]);

  if (!Number.isInteger(rank) || rank < 1) {
    return null;
  }

  const playerLevel = rank + manaResearchFirstPlayerLevel - 1;
  return playerLevel <= manaResearchMaxPlayerLevel ? playerLevel : null;
}

export function getManaResearchDurationSeconds(playerLevel) {
  const safePlayerLevel = normalizePlayerLevel(playerLevel);
  const upperTargetIndex = manaResearchDurationTargets.findIndex(
    (target) => safePlayerLevel <= target.playerLevel,
  );

  if (upperTargetIndex <= 0) {
    return manaResearchDurationTargets[0].durationSeconds;
  }

  const lowerTarget = manaResearchDurationTargets[upperTargetIndex - 1];
  const upperTarget = manaResearchDurationTargets[upperTargetIndex];
  const progress =
    (safePlayerLevel - lowerTarget.playerLevel) /
    (upperTarget.playerLevel - lowerTarget.playerLevel);
  const durationSeconds =
    lowerTarget.durationSeconds *
    (upperTarget.durationSeconds / lowerTarget.durationSeconds) ** progress;

  return Math.round(durationSeconds);
}

export function getManaResearchDurationSecondsForId(researchId) {
  const capacityPlayerLevel = getManaResearchPlayerLevel(
    researchId,
    manaResearchSeriesIds.capacity,
  );
  const generationPlayerLevel = getManaResearchPlayerLevel(
    researchId,
    manaResearchSeriesIds.generation,
  );
  const playerLevel = capacityPlayerLevel ?? generationPlayerLevel;

  return playerLevel === null ? null : getManaResearchDurationSeconds(playerLevel);
}

export function isLegacyManaResearchDuration(researchId, durationSeconds) {
  const defaultDurationSeconds = getManaResearchDurationSecondsForId(researchId);

  return (
    defaultDurationSeconds !== null &&
    defaultDurationSeconds !== legacyManaResearchDurationSeconds &&
    Math.floor(Number(durationSeconds)) === legacyManaResearchDurationSeconds
  );
}

export function getManaCapacityResearchCostCoin(playerLevel) {
  return getManaResearchCostCoin({
    playerLevel,
    baseCostCoin: capacityBaseCostCoin,
    level17CostCoin: capacityLevel17CostCoin,
    level44CostCoin: capacityLevel44CostCoin,
    level100CostCoin: capacityLevel100CostCoin,
  });
}

export function getManaGenerationResearchCostCoin(playerLevel) {
  return getManaResearchCostCoin({
    playerLevel,
    baseCostCoin: generationBaseCostCoin,
    level17CostCoin: generationLevel17CostCoin,
    level44CostCoin: generationLevel44CostCoin,
    level100CostCoin: generationLevel100CostCoin,
  });
}

export function getManaGenerationResearchIncrease(playerLevel) {
  const safePlayerLevel = normalizePlayerLevel(playerLevel);

  if (safePlayerLevel <= 5) {
    return 1;
  }

  if (safePlayerLevel <= 10) {
    return 0.5;
  }

  return 0.25;
}

export function getManaGenerationThroughPlayerLevel(playerLevel) {
  if (Math.floor(Number(playerLevel)) < manaResearchFirstPlayerLevel) {
    return 1;
  }

  const safePlayerLevel = normalizePlayerLevel(playerLevel);
  let total = 1;

  for (
    let level = manaResearchFirstPlayerLevel;
    level <= safePlayerLevel;
    level += 1
  ) {
    total += getManaGenerationResearchIncrease(level);
  }

  return total;
}

export function createManaResearchCostsCoin() {
  const costs = {};

  for (
    let playerLevel = manaResearchFirstPlayerLevel;
    playerLevel <= manaResearchMaxPlayerLevel;
    playerLevel += 1
  ) {
    costs[manaResearchIds.capacity(playerLevel)] =
      getManaCapacityResearchCostCoin(playerLevel);
    costs[manaResearchIds.generation(playerLevel)] =
      getManaGenerationResearchCostCoin(playerLevel);
  }

  return costs;
}

function getManaResearchCostCoin({
  playerLevel,
  baseCostCoin,
  level17CostCoin,
  level44CostCoin,
  level100CostCoin,
}) {
  const safePlayerLevel = normalizePlayerLevel(playerLevel);
  const earlySteps =
    Math.min(safePlayerLevel, earlyCostTargetPlayerLevel) -
    manaResearchFirstPlayerLevel;
  const midSteps =
    Math.min(
      Math.max(safePlayerLevel, earlyCostTargetPlayerLevel),
      midCostTargetPlayerLevel,
    ) - earlyCostTargetPlayerLevel;
  const lateSteps = Math.max(
    0,
    safePlayerLevel - midCostTargetPlayerLevel,
  );
  const earlyGrowthMultiplier =
    (level17CostCoin / baseCostCoin) **
    (1 / (earlyCostTargetPlayerLevel - manaResearchFirstPlayerLevel));
  const midGrowthMultiplier =
    (level44CostCoin / level17CostCoin) **
    (1 / (midCostTargetPlayerLevel - earlyCostTargetPlayerLevel));
  const lateGrowthMultiplier =
    (level100CostCoin / level44CostCoin) **
    (1 / (manaResearchMaxPlayerLevel - midCostTargetPlayerLevel));
  const rawCost =
    baseCostCoin *
    earlyGrowthMultiplier ** earlySteps *
    midGrowthMultiplier ** midSteps *
    lateGrowthMultiplier ** lateSteps;

  return Math.min(maximumCostCoin, roundManaResearchCost(rawCost));
}

function roundManaResearchCost(value) {
  const step =
    value < 100
      ? 5
      : value < 1_000
        ? 10
        : value < 10_000
          ? 100
          : value < 100_000
            ? 1_000
            : value < 1_000_000
              ? 10_000
              : value < 10_000_000
                ? 100_000
                : value < 100_000_000
                  ? 1_000_000
                  : 10_000_000;

  return Math.round(value / step) * step;
}

function normalizePlayerLevel(playerLevel) {
  const safePlayerLevel = Math.floor(Number(playerLevel));

  if (!Number.isInteger(safePlayerLevel)) {
    return manaResearchFirstPlayerLevel;
  }

  return Math.max(
    manaResearchFirstPlayerLevel,
    Math.min(manaResearchMaxPlayerLevel, safePlayerLevel),
  );
}

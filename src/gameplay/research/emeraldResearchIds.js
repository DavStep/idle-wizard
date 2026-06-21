export const emeraldResearchMinMultiplier = 2;
export const emeraldResearchMaxMultiplier = 5;

export const emeraldResearchIds = Object.freeze({
  plotPlanting: (plotNumber, multiplier) =>
    `emerald:plotPlanting:${plotNumber}:${multiplier}`,
  cauldronBrewing: (cauldronNumber, multiplier) =>
    `emerald:cauldronBrewing:${cauldronNumber}:${multiplier}`,
});

export function getEmeraldResearchCost({ targetNumber, multiplier }) {
  const safeTargetNumber = Math.max(1, Math.floor(Number(targetNumber) || 1));
  const safeMultiplier = Math.max(
    emeraldResearchMinMultiplier,
    Math.floor(Number(multiplier) || emeraldResearchMinMultiplier),
  );

  return safeTargetNumber * Math.max(1, safeMultiplier - 1);
}

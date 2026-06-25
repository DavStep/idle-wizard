export const emeraldResearchMinMultiplier = 2;
export const emeraldResearchMaxMultiplier = 5;
export const EMERALD_RESEARCH_STAR_SYMBOL = '\u2605';

export const emeraldResearchIds = Object.freeze({
  plotPlanting: (plotNumber, multiplier) =>
    `emerald:plotPlanting:${plotNumber}:${multiplier}`,
  cauldronBrewing: (cauldronNumber, multiplier) =>
    `emerald:cauldronBrewing:${cauldronNumber}:${multiplier}`,
});

export function getEmeraldResearchCost({ multiplier }) {
  const safeMultiplier = Math.max(
    emeraldResearchMinMultiplier,
    Math.floor(Number(multiplier) || emeraldResearchMinMultiplier),
  );

  return safeMultiplier - emeraldResearchMinMultiplier + 1;
}

export function getEmeraldResearchStarLevel(multiplier) {
  const safeMultiplier = Math.max(1, Math.floor(Number(multiplier) || 1));
  return Math.max(0, safeMultiplier - 1);
}

export function formatEmeraldResearchStarLevel(starLevel) {
  const safeStarLevel = Math.max(0, Math.floor(Number(starLevel) || 0));
  return EMERALD_RESEARCH_STAR_SYMBOL.repeat(safeStarLevel);
}

export function formatEmeraldResearchStars(multiplier) {
  return formatEmeraldResearchStarLevel(getEmeraldResearchStarLevel(multiplier));
}

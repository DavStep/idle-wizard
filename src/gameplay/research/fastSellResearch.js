export const fastSellBasePercent = 80;
export const fastSellResearchStepPercent = 5;
export const fastSellResearchMaxLevel = 3;
export const fastSellResearchCostsRuby = [2, 5, 10];

export const fastSellResearchIds = Object.freeze({
  payout: (level) => `fastSellPayout:${level}`,
});

export function getFastSellPercent(level = 0) {
  const safeLevel = Math.max(
    0,
    Math.min(fastSellResearchMaxLevel, Math.floor(Number(level) || 0)),
  );

  return fastSellBasePercent + safeLevel * fastSellResearchStepPercent;
}

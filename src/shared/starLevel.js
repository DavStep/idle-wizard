export const STAR_LEVEL_TONES = Object.freeze([
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'green',
  'silver',
]);

export const STARS_PER_TONE = 3;
export const MAX_STAR_LEVEL = 20;

export function resolveStarLevel(
  level,
  { slotCount = STARS_PER_TONE } = {},
) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  const safeSlotCount = normalizeStarSlotCount(slotCount);
  const visualLevel = Math.min(safeLevel, MAX_STAR_LEVEL);

  if (visualLevel === 0) {
    return {
      level: safeLevel,
      tone: 'empty',
      starCount: 0,
      slotCount: safeSlotCount,
    };
  }

  const zeroBasedLevel = visualLevel - 1;
  return {
    level: safeLevel,
    tone: STAR_LEVEL_TONES[Math.floor(zeroBasedLevel / STARS_PER_TONE)],
    starCount: Math.min(
      (zeroBasedLevel % STARS_PER_TONE) + 1,
      safeSlotCount,
    ),
    slotCount: safeSlotCount,
  };
}

export function normalizeStarSlotCount(slotCount) {
  return Math.min(
    STARS_PER_TONE,
    Math.max(1, Math.floor(Number(slotCount) || STARS_PER_TONE)),
  );
}

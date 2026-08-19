export const LEGACY_ITEM_TIMER_RESEARCH_DURATION_SECONDS = 5;
export const ITEM_TIMER_RESEARCH_MAX_LEVEL = 19;

export function getItemTimerResearchMaxLevel(): number {
  return ITEM_TIMER_RESEARCH_MAX_LEVEL;
}

export function isLegacyItemTimerResearchDuration(
  researchId: string,
  durationSeconds: number | bigint,
): boolean {
  return (
    String(researchId ?? '').startsWith('timer:') &&
    BigInt(durationSeconds) === BigInt(LEGACY_ITEM_TIMER_RESEARCH_DURATION_SECONDS)
  );
}

export function getItemTimerResearchDurationSeconds(
  configuredDurationMs: number,
  level: number,
): number {
  const safeDurationMs = Math.max(0, Number(configuredDurationMs) || 0);
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));

  if (safeDurationMs <= 0) {
    return 0;
  }

  return Math.max(5, Math.ceil((safeDurationMs / 1_000) * safeLevel));
}

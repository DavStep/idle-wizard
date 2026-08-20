export const LEGACY_MANA_RESEARCH_DURATION_SECONDS = 5;

const MANA_RESEARCH_FIRST_PLAYER_LEVEL = 2;
const MANA_RESEARCH_MAX_PLAYER_LEVEL = 100;
const MANA_RESEARCH_DURATION_TARGETS = [
  { playerLevel: 2, durationSeconds: 5 },
  { playerLevel: 17, durationSeconds: 30 * 60 },
  { playerLevel: 44, durationSeconds: 2 * 60 * 60 },
  { playerLevel: 100, durationSeconds: 4 * 60 * 60 },
] as const;

export function getManaResearchDurationSeconds(playerLevel: number): number {
  const safePlayerLevel = Math.max(
    MANA_RESEARCH_FIRST_PLAYER_LEVEL,
    Math.min(MANA_RESEARCH_MAX_PLAYER_LEVEL, Math.floor(Number(playerLevel) || 0)),
  );
  const upperTargetIndex = MANA_RESEARCH_DURATION_TARGETS.findIndex(
    (target) => safePlayerLevel <= target.playerLevel,
  );

  if (upperTargetIndex <= 0) {
    return MANA_RESEARCH_DURATION_TARGETS[0].durationSeconds;
  }

  const lowerTarget = MANA_RESEARCH_DURATION_TARGETS[upperTargetIndex - 1];
  const upperTarget = MANA_RESEARCH_DURATION_TARGETS[upperTargetIndex];
  const progress =
    (safePlayerLevel - lowerTarget.playerLevel) /
    (upperTarget.playerLevel - lowerTarget.playerLevel);
  const durationSeconds =
    lowerTarget.durationSeconds *
    (upperTarget.durationSeconds / lowerTarget.durationSeconds) ** progress;

  return Math.round(durationSeconds);
}

export function getManaResearchPlayerLevel(researchId: string): number | null {
  const match = /^(?:manaSphereCap|manaProductionRate):(\d+)$/.exec(
    String(researchId ?? ''),
  );
  const rank = Number(match?.[1]);

  if (!Number.isInteger(rank) || rank < 1) {
    return null;
  }

  const playerLevel = rank + MANA_RESEARCH_FIRST_PLAYER_LEVEL - 1;
  return playerLevel <= MANA_RESEARCH_MAX_PLAYER_LEVEL ? playerLevel : null;
}

export function getManaResearchDurationSecondsForId(researchId: string): number | null {
  const playerLevel = getManaResearchPlayerLevel(researchId);
  return playerLevel === null ? null : getManaResearchDurationSeconds(playerLevel);
}

export function isLegacyManaResearchDuration(
  researchId: string,
  durationSeconds: number | bigint,
): boolean {
  const defaultDurationSeconds = getManaResearchDurationSecondsForId(researchId);
  const numericDurationSeconds = Number(durationSeconds);

  return (
    defaultDurationSeconds !== null &&
    defaultDurationSeconds !== LEGACY_MANA_RESEARCH_DURATION_SECONDS &&
    Number.isFinite(numericDurationSeconds) &&
    Math.floor(numericDurationSeconds) === LEGACY_MANA_RESEARCH_DURATION_SECONDS
  );
}

const FALLBACK_LEVEL_REQUIREMENTS_LABEL = 'level requirements';

export function getLevelRequirementTargetLevel(taskSnapshot = {}) {
  const currentLevel = Math.floor(
    Number(taskSnapshot?.level?.level ?? taskSnapshot?.currentLevel),
  );

  if (!Number.isFinite(currentLevel) || currentLevel < 0) {
    return null;
  }

  const maxLevel = Math.floor(Number(taskSnapshot?.maxLevel));

  if (Number.isFinite(maxLevel) && maxLevel >= 1 && currentLevel >= maxLevel) {
    return maxLevel;
  }

  return currentLevel + 1;
}

export function formatLevelRequirementsLabel(taskSnapshot = {}) {
  const targetLevel = getLevelRequirementTargetLevel(taskSnapshot);

  return targetLevel
    ? `level ${targetLevel} requirements`
    : FALLBACK_LEVEL_REQUIREMENTS_LABEL;
}

export function formatOpenLevelRequirementsLabel(taskSnapshot = {}) {
  return `open ${formatLevelRequirementsLabel(taskSnapshot)}`;
}

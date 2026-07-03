export const taskRequirementTypes = Object.freeze({
  TURN_IN: 'turnIn',
  RESEARCH: 'research',
  SUMMON: 'summon',
  GROW: 'grow',
  BREW: 'brew',
  SELL: 'sell',
});

export const taskRequirementTypeSet = new Set(Object.values(taskRequirementTypes));

export function normalizeTaskRequirementType(value) {
  if (value === undefined || value === null || value === '' || value === 'drop') {
    return taskRequirementTypes.TURN_IN;
  }

  const type = String(value).trim();
  return taskRequirementTypeSet.has(type) ? type : null;
}

export function isTurnInRequirement(type) {
  return normalizeTaskRequirementType(type) === taskRequirementTypes.TURN_IN;
}

export function isActionRequirement(type) {
  const normalized = normalizeTaskRequirementType(type);
  return Boolean(normalized && normalized !== taskRequirementTypes.TURN_IN);
}

export function getTaskRequirementVerb(type) {
  switch (normalizeTaskRequirementType(type)) {
    case taskRequirementTypes.RESEARCH:
      return 'research';
    case taskRequirementTypes.SUMMON:
      return 'summon';
    case taskRequirementTypes.GROW:
      return 'grow';
    case taskRequirementTypes.BREW:
      return 'brew';
    case taskRequirementTypes.SELL:
      return 'sell';
    case taskRequirementTypes.TURN_IN:
    default:
      return 'turn in';
  }
}

export function formatTaskRequirementLabel(type, targetLabel) {
  const label = String(targetLabel ?? '').trim();
  const verb = getTaskRequirementVerb(type);
  return label ? `${verb} ${label}` : verb;
}

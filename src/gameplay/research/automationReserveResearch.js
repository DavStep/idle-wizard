export const automationReserveResearchMaxLevel = 3;

export const automationReserveResearchIds = Object.freeze({
  controls: (level) => `advanced:automationReserve:${level}`,
});

export function getAutomationReserveResearchLabel(level) {
  const safeLevel = normalizeAutomationReserveResearchLevel(level);

  return `automation reserve lvl ${safeLevel}`;
}

export function getAutomationReserveResearchValue(level) {
  const safeLevel = normalizeAutomationReserveResearchLevel(level);

  if (safeLevel === 1) {
    return '75% preset';
  }

  if (safeLevel === 2) {
    return 'cap preset';
  }

  return '1000 step';
}

export function getAutomationReserveMaxMana() {
  return 5_000;
}

export function getAutomationReserveStep(level = 0) {
  const safeLevel = normalizeAutomationReserveResearchLevel(level, { allowZero: true });

  if (safeLevel >= 3) {
    return 1_000;
  }

  if (safeLevel >= 1) {
    return 500;
  }

  return 100;
}

export function getAutomationReservePresetFractions(level = 0) {
  const safeLevel = normalizeAutomationReserveResearchLevel(level, { allowZero: true });
  const presets = [0, 0.25, 0.5];

  if (safeLevel >= 1) {
    presets.push(0.75);
  }

  if (safeLevel >= 2) {
    presets.push(1);
  }

  return presets;
}

export function normalizeAutomationReserveResearchLevel(
  level,
  { allowZero = false } = {},
) {
  const safeLevel = Math.floor(Number(level));
  const minimum = allowZero ? 0 : 1;

  if (!Number.isFinite(safeLevel)) {
    return minimum;
  }

  return Math.max(minimum, Math.min(automationReserveResearchMaxLevel, safeLevel));
}

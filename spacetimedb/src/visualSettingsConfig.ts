export const VISUAL_SETTINGS_COST_CATEGORIES = Object.freeze([
  'theme',
  'font',
  'character',
  'frame',
  'progressBar',
  'plotView',
]);

export function hasCurrentVisualSettingsConfigShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const costsCrystal = value.costsCrystal;
  if (!isRecord(costsCrystal)) {
    return false;
  }

  return VISUAL_SETTINGS_COST_CATEGORIES.every((category) =>
    isRecord(costsCrystal[category]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

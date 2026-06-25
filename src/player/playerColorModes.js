export const DEFAULT_PLAYER_COLOR_MODE = 'resources';

export const PLAYER_COLOR_MODE_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'resources',
    label: 'resources',
  }),
]);

const COLOR_MODE_KEYS = new Set(PLAYER_COLOR_MODE_OPTIONS.map((mode) => mode.key));
const COLOR_MODE_ALIASES = new Map([
  ['monochrome', 'resources'],
  ['mono', 'resources'],
  ['color', 'resources'],
  ['colored', 'resources'],
  ['colour', 'resources'],
  ['coloured', 'resources'],
]);

export function normalizePlayerColorMode(colorMode) {
  const value = String(colorMode ?? '').trim();
  const normalizedValue = COLOR_MODE_ALIASES.get(value) ?? value;
  return COLOR_MODE_KEYS.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_PLAYER_COLOR_MODE;
}

export function getPlayerColorModeOptions() {
  return PLAYER_COLOR_MODE_OPTIONS.map((mode) => ({ ...mode }));
}

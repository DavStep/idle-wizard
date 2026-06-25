export const DEFAULT_PLAYER_ICON_MODE = 'icons';

export const PLAYER_ICON_MODE_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'icons',
    label: 'icons',
  }),
]);

const ICON_MODE_KEYS = new Set(PLAYER_ICON_MODE_OPTIONS.map((mode) => mode.key));
const ICON_MODE_ALIASES = new Map([
  ['none', 'icons'],
  ['off', 'icons'],
  ['no-icons', 'icons'],
  ['no icons', 'icons'],
  ['on', 'icons'],
  ['icon', 'icons'],
  ['enabled', 'icons'],
]);

export function normalizePlayerIconMode(iconMode) {
  const value = String(iconMode ?? '').trim();
  const normalizedValue = ICON_MODE_ALIASES.get(value) ?? value;
  return ICON_MODE_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_ICON_MODE;
}

export function getPlayerIconModeOptions() {
  return PLAYER_ICON_MODE_OPTIONS.map((mode) => ({ ...mode }));
}

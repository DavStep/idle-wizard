export const DEFAULT_PLAYER_THEME = 'white';

export const PLAYER_THEME_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'white',
    label: 'white',
  }),
  Object.freeze({
    key: 'black',
    label: 'black',
  }),
]);

const THEME_KEYS = new Set(PLAYER_THEME_OPTIONS.map((theme) => theme.key));
const THEME_ALIASES = new Map([
  ['mild-white', 'white'],
  ['mild-black', 'black'],
  ['dark-gray', 'black'],
  ['night-black', 'black'],
]);

export function normalizePlayerTheme(theme) {
  const value = String(theme ?? '').trim();
  const normalizedValue = THEME_ALIASES.get(value) ?? value;
  return THEME_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_THEME;
}

export function getPlayerThemeOptions() {
  return PLAYER_THEME_OPTIONS.map((theme) => ({ ...theme }));
}

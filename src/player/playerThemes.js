export const DEFAULT_PLAYER_THEME = 'night';

export const PLAYER_THEME_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'night',
    label: 'night',
  }),
  Object.freeze({
    key: 'day',
    label: 'day',
  }),
]);

const THEME_KEYS = new Set(PLAYER_THEME_OPTIONS.map((theme) => theme.key));
const THEME_ALIASES = new Map([
  ['midnight', 'night'],
  ['black', 'night'],
  ['witchcraft', 'night'],
  ['mild-white', 'night'],
  ['mild-black', 'night'],
  ['dark-gray', 'night'],
  ['night-black', 'night'],
  ['vs-code-midnight', 'night'],
  ['vscode-midnight', 'night'],
  ['idle-witch-craft', 'night'],
  ['idle witch craft', 'night'],
  ['idle-whitch-craft', 'night'],
  ['idle whitch craft', 'night'],
]);

export function normalizePlayerTheme(theme) {
  const value = String(theme ?? '').trim();
  const normalizedValue = THEME_ALIASES.get(value) ?? value;
  return THEME_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_THEME;
}

export function getPlayerThemeOptions() {
  return PLAYER_THEME_OPTIONS.map((theme) => ({ ...theme }));
}

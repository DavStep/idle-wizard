export const DEFAULT_PLAYER_THEME = 'midnight';

export const PLAYER_THEME_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'black',
    label: 'black',
  }),
  Object.freeze({
    key: 'midnight',
    label: 'midnight',
  }),
  Object.freeze({
    key: 'witchcraft',
    label: 'witchcraft',
  }),
]);

const THEME_KEYS = new Set(PLAYER_THEME_OPTIONS.map((theme) => theme.key));
const THEME_ALIASES = new Map([
  ['mild-white', 'midnight'],
  ['mild-black', 'black'],
  ['dark-gray', 'black'],
  ['night-black', 'black'],
  ['vs-code-midnight', 'midnight'],
  ['vscode-midnight', 'midnight'],
  ['idle-witch-craft', 'witchcraft'],
  ['idle witch craft', 'witchcraft'],
  ['idle-whitch-craft', 'witchcraft'],
  ['idle whitch craft', 'witchcraft'],
]);

export function normalizePlayerTheme(theme) {
  const value = String(theme ?? '').trim();
  const normalizedValue = THEME_ALIASES.get(value) ?? value;
  return THEME_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_THEME;
}

export function getPlayerThemeOptions() {
  return PLAYER_THEME_OPTIONS.map((theme) => ({ ...theme }));
}

export const DEFAULT_PLAYER_PROGRESS_BAR = 'regular';

export const PLAYER_PROGRESS_BAR_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'regular',
    label: 'regular',
  }),
  Object.freeze({
    key: 'gradient',
    label: 'gradient',
  }),
  Object.freeze({
    key: 'notched',
    label: 'bronze',
  }),
]);

const PROGRESS_BAR_KEYS = new Set(PLAYER_PROGRESS_BAR_OPTIONS.map((mode) => mode.key));
const PROGRESS_BAR_ALIASES = new Map([
  ['default', 'regular'],
  ['normal', 'regular'],
  ['plain', 'regular'],
  ['gradinet', 'gradient'],
  ['grad', 'gradient'],
  ['bronze', 'notched'],
  ['tally', 'notched'],
  ['ticks', 'notched'],
]);

export function normalizePlayerProgressBar(progressBar) {
  const value = String(progressBar ?? '').trim();
  const normalizedValue = PROGRESS_BAR_ALIASES.get(value) ?? value;
  return PROGRESS_BAR_KEYS.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_PLAYER_PROGRESS_BAR;
}

export function getPlayerProgressBarOptions() {
  return PLAYER_PROGRESS_BAR_OPTIONS.map((mode) => ({ ...mode }));
}

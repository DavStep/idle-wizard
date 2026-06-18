export const DEFAULT_PLAYER_CHARACTER = 'elara';

export const PLAYER_CHARACTER_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'elara',
    label: 'elara',
  }),
  Object.freeze({
    key: 'mira',
    label: 'mira',
  }),
  Object.freeze({
    key: 'bramble',
    label: 'bramble',
  }),
  Object.freeze({
    key: 'corvin',
    label: 'corvin',
  }),
  Object.freeze({
    key: 'juniper',
    label: 'juniper',
  }),
  Object.freeze({
    key: 'rowan',
    label: 'rowan',
  }),
]);

const CHARACTER_KEYS = new Set(PLAYER_CHARACTER_OPTIONS.map((character) => character.key));
const CHARACTER_ALIASES = new Map([
  ['witch', 'elara'],
  ['witch-guide', 'elara'],
  ['guide', 'elara'],
]);

export function normalizePlayerCharacter(character) {
  const value = String(character ?? '').trim().toLowerCase();
  const normalizedValue = CHARACTER_ALIASES.get(value) ?? value;
  return CHARACTER_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_CHARACTER;
}

export function getPlayerCharacterOptions() {
  return PLAYER_CHARACTER_OPTIONS.map((character) => ({ ...character }));
}

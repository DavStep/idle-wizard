export const DEFAULT_PLAYER_FONT = 'source-serif';

export const PLAYER_FONT_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'source-serif',
    label: 'source serif',
  }),
  Object.freeze({
    key: 'inter',
    label: 'inter',
  }),
]);

const FONT_KEYS = new Set(PLAYER_FONT_OPTIONS.map((font) => font.key));
const FONT_ALIASES = new Map([
  ['serif', 'source-serif'],
  ['source-serif-4', 'source-serif'],
  ['source serif', 'source-serif'],
  ['sans', 'inter'],
  ['sans-serif', 'inter'],
]);

export function normalizePlayerFont(font) {
  const value = String(font ?? '').trim();
  const normalizedValue = FONT_ALIASES.get(value) ?? value;
  return FONT_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_FONT;
}

export function getPlayerFontOptions() {
  return PLAYER_FONT_OPTIONS.map((font) => ({ ...font }));
}

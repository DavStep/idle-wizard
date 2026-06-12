export const DEFAULT_PLAYER_FONT = 'lexend';

export const PLAYER_FONT_OPTIONS = Object.freeze([
  Object.freeze({
    key: 'lexend',
    label: 'lexend',
  }),
  Object.freeze({
    key: 'comic-sans-mono',
    label: 'comic sans mono',
  }),
]);

const FONT_KEYS = new Set(PLAYER_FONT_OPTIONS.map((font) => font.key));
const FONT_ALIASES = new Map([
  ['comic sans mono', 'comic-sans-mono'],
  ['comic-mono', 'comic-sans-mono'],
  ['google-lexend', 'lexend'],
]);

export function normalizePlayerFont(font) {
  const value = String(font ?? '').trim();
  const normalizedValue = FONT_ALIASES.get(value) ?? value;
  return FONT_KEYS.has(normalizedValue) ? normalizedValue : DEFAULT_PLAYER_FONT;
}

export function getPlayerFontOptions() {
  return PLAYER_FONT_OPTIONS.map((font) => ({ ...font }));
}

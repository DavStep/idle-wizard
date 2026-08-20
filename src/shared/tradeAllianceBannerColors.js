export const DEFAULT_TRADE_ALLIANCE_BANNER_COLOR = 'blue';
export const DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR = 'gold';

export const TRADE_ALLIANCE_BANNER_COLORS = Object.freeze([
  Object.freeze({ id: 'ink', label: 'Ink', value: '#252936' }),
  Object.freeze({ id: 'red', label: 'Crimson', value: '#9f3d36' }),
  Object.freeze({ id: 'amber', label: 'Amber', value: '#a56a28' }),
  Object.freeze({ id: 'green', label: 'Forest', value: '#3d7448' }),
  Object.freeze({ id: 'teal', label: 'Teal', value: '#2a7070' }),
  Object.freeze({ id: 'blue', label: 'Azure', value: '#315fa8' }),
  Object.freeze({ id: 'violet', label: 'Violet', value: '#67498d' }),
  Object.freeze({ id: 'magenta', label: 'Plum', value: '#843f70' }),
  Object.freeze({ id: 'brown', label: 'Umber', value: '#684a36' }),
  Object.freeze({ id: 'slate', label: 'Slate', value: '#576474' }),
]);

export const TRADE_ALLIANCE_EMBLEM_COLORS = Object.freeze([
  Object.freeze({ id: 'white', label: 'White', value: '#fff9ed' }),
  Object.freeze({ id: 'gold', label: 'Gold', value: '#f7c84b' }),
  Object.freeze({ id: 'silver', label: 'Silver', value: '#ccd6e2' }),
  Object.freeze({ id: 'red', label: 'Coral', value: '#ef675a' }),
  Object.freeze({ id: 'amber', label: 'Orange', value: '#ffa044' }),
  Object.freeze({ id: 'green', label: 'Leaf', value: '#8bd66a' }),
  Object.freeze({ id: 'teal', label: 'Aqua', value: '#68d8cf' }),
  Object.freeze({ id: 'blue', label: 'Sky', value: '#78adff' }),
  Object.freeze({ id: 'violet', label: 'Lilac', value: '#b997f2' }),
  Object.freeze({ id: 'magenta', label: 'Rose', value: '#ef8bc8' }),
]);

const BANNER_COLORS_BY_ID = new Map(
  TRADE_ALLIANCE_BANNER_COLORS.map((color) => [color.id, color]),
);
const EMBLEM_COLORS_BY_ID = new Map(
  TRADE_ALLIANCE_EMBLEM_COLORS.map((color) => [color.id, color]),
);

export function normalizeTradeAllianceBannerColor(colorId) {
  const safeColorId = String(colorId ?? '').trim().toLowerCase();
  return BANNER_COLORS_BY_ID.has(safeColorId)
    ? safeColorId
    : DEFAULT_TRADE_ALLIANCE_BANNER_COLOR;
}

export function normalizeTradeAllianceEmblemColor(colorId) {
  const safeColorId = String(colorId ?? '').trim().toLowerCase();
  return EMBLEM_COLORS_BY_ID.has(safeColorId)
    ? safeColorId
    : DEFAULT_TRADE_ALLIANCE_EMBLEM_COLOR;
}

export function getTradeAllianceBannerColor(colorId) {
  return BANNER_COLORS_BY_ID.get(normalizeTradeAllianceBannerColor(colorId));
}

export function getTradeAllianceEmblemColor(colorId) {
  return EMBLEM_COLORS_BY_ID.get(normalizeTradeAllianceEmblemColor(colorId));
}

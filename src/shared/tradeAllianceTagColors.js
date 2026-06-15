export const DEFAULT_TRADE_ALLIANCE_TAG_COLOR = 'ink';

export const TRADE_ALLIANCE_TAG_COLORS = Object.freeze([
  { id: 'ink', label: 'ink', cssValue: 'var(--style-alliance-tag-ink)' },
  { id: 'red', label: 'red', cssValue: 'var(--style-alliance-tag-red)' },
  { id: 'amber', label: 'amber', cssValue: 'var(--style-alliance-tag-amber)' },
  { id: 'green', label: 'green', cssValue: 'var(--style-alliance-tag-green)' },
  { id: 'teal', label: 'teal', cssValue: 'var(--style-alliance-tag-teal)' },
  { id: 'blue', label: 'blue', cssValue: 'var(--style-alliance-tag-blue)' },
  { id: 'violet', label: 'violet', cssValue: 'var(--style-alliance-tag-violet)' },
  { id: 'magenta', label: 'magenta', cssValue: 'var(--style-alliance-tag-magenta)' },
  { id: 'brown', label: 'brown', cssValue: 'var(--style-alliance-tag-brown)' },
  { id: 'slate', label: 'slate', cssValue: 'var(--style-alliance-tag-slate)' },
]);

const TRADE_ALLIANCE_TAG_COLOR_IDS = new Set(
  TRADE_ALLIANCE_TAG_COLORS.map((color) => color.id),
);

export function normalizeTradeAllianceTagColor(colorId) {
  const safeColorId = String(colorId ?? '').trim().toLowerCase();
  return TRADE_ALLIANCE_TAG_COLOR_IDS.has(safeColorId)
    ? safeColorId
    : DEFAULT_TRADE_ALLIANCE_TAG_COLOR;
}

export function getTradeAllianceTagColor(colorId) {
  const normalizedColorId = normalizeTradeAllianceTagColor(colorId);
  return (
    TRADE_ALLIANCE_TAG_COLORS.find((color) => color.id === normalizedColorId) ??
    TRADE_ALLIANCE_TAG_COLORS[0]
  );
}

export function getTradeAllianceTagColorCssValue(colorId) {
  return getTradeAllianceTagColor(colorId).cssValue;
}

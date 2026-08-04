const BUTTON_ASSET_COLOR = Object.freeze({
  blue: 'blue',
  brown: 'brown',
  'brown-dark': 'dark-brown',
  'brown-light': 'brown',
  gray: 'gray',
  green: 'green',
  purple: 'purple',
  red: 'red',
  yellow: 'yellow',
});

export const PIXI_BUTTON_COLORS = Object.freeze([
  'blue',
  'brown',
  'brown-dark',
  'gray',
  'green',
  'purple',
  'red',
  'yellow',
]);

export const PIXI_BUTTON_SIZE_TIERS = Object.freeze([50, 30, 15]);

const SOURCE_INSETS_BY_SIZE = Object.freeze({
  50: Object.freeze({ top: 100, right: 52, bottom: 68, left: 86 }),
  30: Object.freeze({ top: 60, right: 32, bottom: 41, left: 52 }),
  15: Object.freeze({ top: 30, right: 16, bottom: 20, left: 27 }),
});

const OUTPUT_INSETS_50 = Object.freeze({
  top: 17,
  right: 7,
  bottom: 12,
  left: 20,
});

const TAB_OUTPUT_INSETS_50 = Object.freeze({
  top: 13,
  right: 7,
  bottom: 9,
  left: 20,
});

export function isPixiButtonColor(value) {
  return Object.hasOwn(BUTTON_ASSET_COLOR, String(value ?? ''));
}

export function normalizePixiButtonColor(value, fallback = 'brown-dark') {
  const normalized = String(value ?? '').trim().toLowerCase();
  return isPixiButtonColor(normalized) ? normalized : fallback;
}

export function normalizePixiButtonSizeTier(value, fallback = 50) {
  const size = Number(value);
  return PIXI_BUTTON_SIZE_TIERS.includes(size) ? size : fallback;
}

export function getPixiButtonAssetId(color, sizeTier = 50) {
  const normalizedColor = normalizePixiButtonColor(color);
  const normalizedSize = normalizePixiButtonSizeTier(sizeTier);
  return `source:assets/ui/regular-button/${BUTTON_ASSET_COLOR[normalizedColor]}-button-${normalizedSize}.9.png`;
}

export function getPixiButtonSkin({
  color,
  compactTab = false,
  sizeTier = 50,
} = {}) {
  const normalizedSize = normalizePixiButtonSizeTier(sizeTier);
  const scale = normalizedSize / 50;
  const outputInsets = compactTab
    ? TAB_OUTPUT_INSETS_50
    : OUTPUT_INSETS_50;

  return Object.freeze({
    assetId: getPixiButtonAssetId(color, normalizedSize),
    borderInsets: scaleInsets(outputInsets, scale),
    minimumCenter: Object.freeze({ width: 1, height: 1 }),
    sizeTier: normalizedSize,
    sourceInsets: SOURCE_INSETS_BY_SIZE[normalizedSize],
  });
}

function scaleInsets(insets, scale) {
  return Object.freeze({
    top: insets.top * scale,
    right: insets.right * scale,
    bottom: insets.bottom * scale,
    left: insets.left * scale,
  });
}

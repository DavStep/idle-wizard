import {
  getPixiSourceNineSliceMetadata,
} from '../assets/PixiProductionAssetManifest.js';
import {
  fitNineSliceOutputInsets,
} from '../nineSlice/NineSliceCompatibility.js';
import { PIXI_UI_GEOMETRY } from '../theme/PixiThemeTokens.js';

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

const TAB_OUTPUT_INSETS_50 = Object.freeze({
  top: 13,
  right: 7,
  bottom: 9,
  left: 20,
});

// Every regular-button tier includes an authored cast shadow at the bottom.
// A full face-center correction lifts Lilita One too far, so preserve half of
// that tier-aware correction as the shared optical nudge.
const BUTTON_BOTTOM_SHADOW_HEIGHT = Object.freeze({
  50: 20,
  30: 12,
  15: 6,
});
const BUTTON_SHADOW_FACE_CENTER_WEIGHT = 0.5;

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
  height = null,
  sizeTier = 50,
  width = null,
} = {}) {
  const normalizedSize = normalizePixiButtonSizeTier(sizeTier);
  const assetId = getPixiButtonAssetId(color, normalizedSize);
  const metadata = getPixiSourceNineSliceMetadata(assetId);
  if (
    !metadata?.slice
    || !metadata?.rendering?.outputInsets
    || !metadata?.rendering?.minimumCenter
  ) {
    throw new Error(
      `Regular button nine-slice metadata is missing for "${assetId}".`,
    );
  }
  const sourceInsets = freezeInsets(metadata.slice);
  const minimumCenter = scaleSize(
    metadata.rendering.minimumCenter,
    1 / PIXI_UI_GEOMETRY.sourceScale,
  );
  const naturalOutputInsets = scaleInsets(
    metadata.rendering.outputInsets,
    1 / PIXI_UI_GEOMETRY.sourceScale,
  );
  const borderInsets = compactTab
    ? scaleInsets(TAB_OUTPUT_INSETS_50, normalizedSize / 50)
    : fitNineSliceOutputInsets({
        minimumCenter,
        outputInsets: naturalOutputInsets,
        targetSize: { width, height },
      });
  const contentOffsetY = resolveButtonContentOffsetY({
    borderInsets,
    sizeTier: normalizedSize,
    sourceInsets,
  });

  return Object.freeze({
    assetId,
    borderInsets,
    contentOffsetY,
    minimumCenter,
    sizeTier: normalizedSize,
    sourceInsets,
  });
}

function resolveButtonContentOffsetY({
  borderInsets,
  sizeTier,
  sourceInsets,
}) {
  const sourceShadowHeight = BUTTON_BOTTOM_SHADOW_HEIGHT[sizeTier] ?? 0;
  const renderedBottomScale = sourceInsets.bottom > 0
    ? borderInsets.bottom / sourceInsets.bottom
    : 0;
  return -(
    (sourceShadowHeight * renderedBottomScale) / 2
  ) * BUTTON_SHADOW_FACE_CENTER_WEIGHT;
}

function scaleInsets(insets, scale) {
  return Object.freeze({
    top: insets.top * scale,
    right: insets.right * scale,
    bottom: insets.bottom * scale,
    left: insets.left * scale,
  });
}

function scaleSize(size, scale) {
  return Object.freeze({
    width: Math.max(0, Number(size?.width) || 0) * scale,
    height: Math.max(0, Number(size?.height) || 0) * scale,
  });
}

function freezeInsets(insets) {
  return Object.freeze({
    top: Math.max(0, Number(insets?.top) || 0),
    right: Math.max(0, Number(insets?.right) || 0),
    bottom: Math.max(0, Number(insets?.bottom) || 0),
    left: Math.max(0, Number(insets?.left) || 0),
  });
}

import {
  getHerbIconFrameName,
  getHerbIconKeyByLabel,
} from '../herbs/herbIcons.js';

const SEED_PACK_FRAME_NAME = 'seed:pack';
export const SEED_PACK_ASPECT_RATIO = 121 / 128;
export const SEED_PACK_ITEM_SCALE = 0.44;
export const SEED_PACK_ITEM_CENTER_Y_RATIO = 0.63;
export const SEED_PACK_ITEM_ROTATION_DEGREES = 6;

/**
 * Renderer-neutral seed icon metadata. Canvas renderers import this module
 * without pulling the legacy SVG element factories into production.
 */
export function getSeedIconFrameName() {
  return SEED_PACK_FRAME_NAME;
}

export function getSeedPackBaseFrameName() {
  return SEED_PACK_FRAME_NAME;
}

export function getHerbKeyForSeed(seed = null) {
  const key = String(seed?.key ?? seed?.itemKey ?? '').trim();

  if (key.endsWith('Seed')) {
    return `${key.slice(0, -'Seed'.length)}Herb`;
  }

  const label = String(seed?.label ?? seed?.itemLabel ?? '')
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+x[\d,]+\s*$/i, '')
    .replace(/\s+seed$/i, '');
  return getHerbIconKeyByLabel(label);
}

export function getSeedPackItemFrameName(seed = null) {
  return getHerbIconFrameName(getHerbKeyForSeed(seed));
}

export function getSeedPackIconFrames(seed = null) {
  return {
    base: getSeedPackBaseFrameName(seed),
    item: getSeedPackItemFrameName(seed),
  };
}

export function getSeedPackIconLayout({
  x = 0,
  y = 0,
  width = 0,
  height = width,
  anchorX = 0,
  anchorY = 0,
  fitPositionX = 0.5,
  fitPositionY = 0.5,
  aspectRatio = SEED_PACK_ASPECT_RATIO,
} = {}) {
  const boxWidth = Math.max(0, Number(width) || 0);
  const boxHeight = Math.max(0, Number(height) || 0);
  const boxLeft = (Number(x) || 0) - boxWidth * (Number(anchorX) || 0);
  const boxTop = (Number(y) || 0) - boxHeight * (Number(anchorY) || 0);
  const normalizedAspectRatio = Number(aspectRatio);
  const shouldFitAspectRatio =
    Number.isFinite(normalizedAspectRatio) && normalizedAspectRatio > 0;
  const fittedWidth = shouldFitAspectRatio
    ? Math.min(boxWidth, boxHeight * normalizedAspectRatio)
    : boxWidth;
  const fittedHeight = shouldFitAspectRatio
    ? Math.min(boxHeight, boxWidth / normalizedAspectRatio)
    : boxHeight;
  const base = {
    x:
      boxLeft +
      (boxWidth - fittedWidth) *
        Math.min(1, Math.max(0, Number(fitPositionX) || 0)),
    y:
      boxTop +
      (boxHeight - fittedHeight) *
        Math.min(1, Math.max(0, Number(fitPositionY) || 0)),
    width: fittedWidth,
    height: fittedHeight,
  };
  const itemSize =
    Math.min(base.width, base.height) * SEED_PACK_ITEM_SCALE;

  return {
    base,
    item: {
      centerX: base.x + base.width / 2,
      centerY: base.y + base.height * SEED_PACK_ITEM_CENTER_Y_RATIO,
      size: itemSize,
      rotationDegrees: SEED_PACK_ITEM_ROTATION_DEGREES,
    },
  };
}

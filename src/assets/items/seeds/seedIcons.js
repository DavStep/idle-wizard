import { createAssetAtlasSprite, getAssetAtlasFrame } from '../../atlas/atlasSprite.js';
import {
  gameAssetAtlasImageUrl,
  gameAssetAtlasSize,
} from '../../generated/game-asset-atlas.generated.js';
import { getHerbIconFrameName, getHerbIconKeyByLabel } from '../herbs/herbIcons.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SEED_PACK_ITEM_SCALE = 0.44;
const SEED_PACK_ITEM_CENTER_Y_RATIO = 0.63;
const SEED_PACK_FRAME_NAME = 'seed:pack';

export function getSeedIconFrameName(seed = null) {
  return getSeedPackBaseFrameName(seed);
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

export function createSeedPackIcon(
  className,
  seed = null,
  {
    compositeClassName = 'style-seed-pack-composite',
    baseClassName = 'style-seed-pack-composite__base',
    itemClassName = 'style-seed-pack-composite__item',
    packFrameName: packFrameNameOverride = null,
    itemFrameName: itemFrameNameOverride = null,
  } = {},
) {
  const packFrameName = packFrameNameOverride || getSeedPackBaseFrameName(seed);
  const itemFrameName = itemFrameNameOverride || getSeedPackItemFrameName(seed);
  const packFrame = getAssetAtlasFrame(packFrameName);
  const itemFrame = itemFrameName ? getAssetAtlasFrame(itemFrameName) : null;

  if (!itemFrame) {
    return createAssetAtlasSprite(className, packFrameName);
  }

  if (!packFrame) {
    return createAssetAtlasSprite(className, packFrameName);
  }

  const root = document.createElementNS(SVG_NAMESPACE, 'svg');
  root.setAttribute('class', `${className} ${compositeClassName}`);
  root.setAttribute('width', String(packFrame.width));
  root.setAttribute('height', String(packFrame.height));
  root.setAttribute('viewBox', `0 0 ${packFrame.width} ${packFrame.height}`);
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  root.dataset.assetAtlasFrame = packFrameName;
  root.dataset.seedPackItemFrame = itemFrameName;
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  root.setAttribute('draggable', 'false');

  const pack = createAtlasFrameSprite(baseClassName, packFrameName, {
    height: packFrame.height,
    width: packFrame.width,
    x: 0,
    y: 0,
  });
  const itemSize = Math.min(packFrame.width, packFrame.height) * SEED_PACK_ITEM_SCALE;
  const itemX = packFrame.width / 2 - itemSize / 2;
  const itemY = packFrame.height * SEED_PACK_ITEM_CENTER_Y_RATIO - itemSize / 2;
  const item = createAtlasFrameSprite(itemClassName, itemFrameName, {
    height: itemSize,
    width: itemSize,
    x: itemX,
    y: itemY,
    transform: `rotate(6 ${itemX + itemSize / 2} ${itemY + itemSize / 2})`,
  });

  root.append(pack, item);
  return root;
}

function createAtlasFrameSprite(
  className,
  frameName,
  { x, y, width, height, transform = '' },
) {
  const frame = getAssetAtlasFrame(frameName);
  const sprite = document.createElementNS(SVG_NAMESPACE, 'svg');
  sprite.setAttribute('class', className);
  sprite.setAttribute('x', formatSvgNumber(x));
  sprite.setAttribute('y', formatSvgNumber(y));
  sprite.setAttribute('width', formatSvgNumber(width));
  sprite.setAttribute('height', formatSvgNumber(height));
  sprite.setAttribute('viewBox', `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
  sprite.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('focusable', 'false');
  sprite.setAttribute('draggable', 'false');
  sprite.dataset.assetAtlasFrame = frameName;

  if (transform) {
    sprite.setAttribute('transform', transform);
  }

  const image = document.createElementNS(SVG_NAMESPACE, 'image');
  image.setAttribute('href', gameAssetAtlasImageUrl);
  image.setAttribute('width', String(gameAssetAtlasSize.width));
  image.setAttribute('height', String(gameAssetAtlasSize.height));
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  sprite.append(image);
  return sprite;
}

function formatSvgNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(3).replace(/\.?0+$/, '') : '0';
}

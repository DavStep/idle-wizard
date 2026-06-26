import {
  gameAssetAtlasFrames,
  gameAssetAtlasImageUrl,
  gameAssetAtlasSize,
} from '../generated/game-asset-atlas.generated.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
let maskSpriteId = 0;

export function getAssetAtlasFrame(frameName) {
  return gameAssetAtlasFrames[frameName] ?? null;
}

export function createAssetAtlasSprite(className, frameName) {
  const frame = getAssetAtlasFrame(frameName);

  if (!frame) {
    return null;
  }

  const sprite = document.createElementNS(SVG_NAMESPACE, 'svg');
  sprite.setAttribute('class', className);
  sprite.setAttribute('width', String(frame.width));
  sprite.setAttribute('height', String(frame.height));
  sprite.setAttribute('viewBox', `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
  sprite.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('focusable', 'false');
  sprite.setAttribute('draggable', 'false');
  sprite.dataset.assetAtlasFrame = frameName;

  const image = document.createElementNS(SVG_NAMESPACE, 'image');
  image.setAttribute('href', gameAssetAtlasImageUrl);
  image.setAttribute('width', String(gameAssetAtlasSize.width));
  image.setAttribute('height', String(gameAssetAtlasSize.height));
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  sprite.append(image);

  return sprite;
}

export function createAssetAtlasMaskedSprite(className, frameName) {
  const frame = getAssetAtlasFrame(frameName);

  if (!frame) {
    return null;
  }

  maskSpriteId += 1;
  const maskId = `asset-atlas-mask-${maskSpriteId}`;
  const sprite = document.createElementNS(SVG_NAMESPACE, 'svg');
  sprite.setAttribute('class', className);
  sprite.setAttribute('width', String(frame.width));
  sprite.setAttribute('height', String(frame.height));
  sprite.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
  sprite.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('focusable', 'false');
  sprite.setAttribute('draggable', 'false');
  sprite.dataset.assetAtlasFrame = frameName;

  const defs = document.createElementNS(SVG_NAMESPACE, 'defs');
  const mask = document.createElementNS(SVG_NAMESPACE, 'mask');
  mask.setAttribute('id', maskId);
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  mask.setAttribute('width', String(frame.width));
  mask.setAttribute('height', String(frame.height));
  mask.setAttribute('mask-type', 'alpha');

  const image = document.createElementNS(SVG_NAMESPACE, 'image');
  image.setAttribute('href', gameAssetAtlasImageUrl);
  image.setAttribute('width', String(gameAssetAtlasSize.width));
  image.setAttribute('height', String(gameAssetAtlasSize.height));
  image.setAttribute('x', String(-frame.x));
  image.setAttribute('y', String(-frame.y));
  mask.append(image);
  defs.append(mask);

  const fill = document.createElementNS(SVG_NAMESPACE, 'rect');
  fill.setAttribute('class', `${className}__fill`);
  fill.setAttribute('width', String(frame.width));
  fill.setAttribute('height', String(frame.height));
  fill.setAttribute('fill', 'currentColor');
  fill.setAttribute('mask', `url(#${maskId})`);

  sprite.append(defs, fill);
  return sprite;
}

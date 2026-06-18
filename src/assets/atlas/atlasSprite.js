import {
  gameAssetAtlasFrames,
  gameAssetAtlasImageUrl,
  gameAssetAtlasSize,
} from '../generated/game-asset-atlas.generated.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

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

import { createAssetAtlasSprite } from '../../assets/atlas/atlasSprite.js';

export const STATUS_ICON_CHECK = 'check';
export const STATUS_ICON_LOCK = 'lock';

export const STATUS_ICON_FRAME_BY_KIND = Object.freeze({
  [STATUS_ICON_CHECK]: 'status:checkDefault',
  [STATUS_ICON_LOCK]: 'status:lockDefault',
});

export function getStatusIconFrame(kind) {
  return STATUS_ICON_FRAME_BY_KIND[kind] ?? null;
}

export function createStatusIcon(className, kind) {
  const frameName = getStatusIconFrame(kind);

  return frameName ? createAssetAtlasSprite(className, frameName) : null;
}

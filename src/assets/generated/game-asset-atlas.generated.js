import atlasImageUrl from '../../../assets/game/atlas/game-asset-atlas.png';
import atlasData from '../../../assets/game/atlas/game-asset-atlas.json';

export const gameAssetAtlasImageUrl = atlasImageUrl;
export const gameAssetAtlasSize = Object.freeze({
  width: atlasData.meta.size.w,
  height: atlasData.meta.size.h,
});
export const gameAssetAtlasFrames = Object.freeze(
  Object.fromEntries(
    Object.entries(atlasData.frames).map(([name, data]) => [
      name,
      Object.freeze({
        x: data.frame.x,
        y: data.frame.y,
        width: data.frame.w,
        height: data.frame.h,
        originalWidth: data.originalSourceSize.w,
        originalHeight: data.originalSourceSize.h,
        source: data.source,
      }),
    ]),
  ),
);

export const gameAssetAtlasPixiData = Object.freeze({
  frames: Object.freeze(atlasData.frames),
  meta: Object.freeze({
    ...atlasData.meta,
    image: atlasImageUrl,
  }),
});

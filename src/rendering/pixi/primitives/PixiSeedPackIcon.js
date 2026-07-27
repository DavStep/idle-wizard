import { Texture } from 'pixi.js';
import {
  getSeedPackIconFrames,
  getSeedPackIconLayout,
} from '../../../assets/items/seeds/seedIconFrames.js';

export function bindPixiSeedPackIcon({
  assetManager,
  base,
  item,
  seed = null,
  baseFrameName = null,
  itemFrameName = null,
}) {
  const frames = getSeedPackIconFrames(seed);
  const resolvedBaseFrame = baseFrameName || frames.base;
  const resolvedItemFrame = itemFrameName || frames.item;

  base.texture = resolvedBaseFrame
    ? assetManager?.getAtlasTexture?.(resolvedBaseFrame) ?? Texture.EMPTY
    : Texture.EMPTY;
  item.texture = resolvedItemFrame
    ? assetManager?.getAtlasTexture?.(resolvedItemFrame) ?? Texture.EMPTY
    : Texture.EMPTY;
  base.visible = Boolean(resolvedBaseFrame);
  base.renderable = base.visible;
  item.visible = base.visible && Boolean(resolvedItemFrame);
  item.renderable = item.visible;
  return base.visible;
}

export function layoutPixiSeedPackIcon({
  base,
  item,
  x,
  y,
  width,
  height = width,
  anchorX = 0.5,
  anchorY = 0.5,
  fitPositionX = 0.5,
  fitPositionY = 0.5,
}) {
  const layout = getSeedPackIconLayout({
    x,
    y,
    width,
    height,
    anchorX,
    anchorY,
    fitPositionX,
    fitPositionY,
  });

  base.anchor?.set?.(0.5);
  base.position.set(
    layout.base.x + layout.base.width / 2,
    layout.base.y + layout.base.height / 2,
  );
  base.width = layout.base.width;
  base.height = layout.base.height;

  item.anchor?.set?.(0.5);
  item.position.set(layout.item.centerX, layout.item.centerY);
  item.width = layout.item.size;
  item.height = layout.item.size;
  item.rotation = (layout.item.rotationDegrees * Math.PI) / 180;
  return layout;
}

export function resetPixiSeedPackIcon({ base, item }) {
  base.texture = Texture.EMPTY;
  base.visible = false;
  base.renderable = false;
  item.texture = Texture.EMPTY;
  item.visible = false;
  item.renderable = false;
  item.rotation = 0;
}

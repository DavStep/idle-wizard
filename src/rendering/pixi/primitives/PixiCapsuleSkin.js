import {
  Container,
  NineSliceSprite,
  Texture,
} from 'pixi.js';

export const PIXI_CAPSULE_ASSETS = Object.freeze({
  track:
    'source:assets/ui/root-run-progress/progress-track.9.png',
  fillMask:
    'source:assets/ui/root-run-progress/progress-fill-mask.9.png',
});

const CAPSULE_SOURCE_GEOMETRY = Object.freeze({
  track: Object.freeze({
    left: 31,
    top: 25,
    right: 31,
    bottom: 26,
    radiusX: 31,
    radiusY: 25.5,
  }),
  fillMask: Object.freeze({
    left: 19,
    top: 17,
    right: 19,
    bottom: 18,
    radiusX: 19,
    radiusY: 17.5,
  }),
});

export function createPixiCapsuleSlice({
  assetManager = null,
  kind,
  label,
  allowPartialAssets = false,
} = {}) {
  const source = CAPSULE_SOURCE_GEOMETRY[kind];
  const assetId = PIXI_CAPSULE_ASSETS[kind];
  if (!source || !assetId) {
    throw new Error(`Unknown Pixi capsule skin kind: ${kind}`);
  }

  const root = new Container({ label });
  const texture = allowPartialAssets
    ? assetManager?.getTexture?.(assetId, { allowPartial: true })
    : assetManager?.getTexture?.(assetId);
  const sprite = new NineSliceSprite({
    texture: texture ?? Texture.EMPTY,
    leftWidth: source.left,
    topHeight: source.top,
    rightWidth: source.right,
    bottomHeight: source.bottom,
    label: `${label}:slice`,
  });
  root.sprite = sprite;
  root.addChild(sprite);
  return root;
}

export function setPixiCapsuleBounds(
  sprite,
  {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    kind,
    orientation = 'horizontal',
  } = {},
) {
  const source = CAPSULE_SOURCE_GEOMETRY[kind];
  if (!source) {
    throw new Error(`Unknown Pixi capsule skin kind: ${kind}`);
  }

  const nextWidth = Math.max(0, Number(width) || 0);
  const nextHeight = Math.max(0, Number(height) || 0);
  const slice = sprite?.sprite;
  if (!slice) {
    throw new Error('Pixi capsule skin is missing its nine-slice child.');
  }

  sprite.visible = nextWidth > 0 && nextHeight > 0;
  if (!sprite.visible) {
    return sprite;
  }

  const outputRadius = Math.min(nextWidth, nextHeight) / 2;
  const scaleX = outputRadius / source.radiusX;
  const scaleY = outputRadius / source.radiusY;
  slice.scale.set(scaleX, scaleY);

  if (orientation === 'vertical') {
    slice.rotation = Math.PI / 2;
    slice.position.set(x + nextWidth, y);
    slice.setSize(
      nextHeight / scaleX,
      nextWidth / scaleY,
    );
    return sprite;
  }

  slice.rotation = 0;
  slice.position.set(x, y);
  slice.setSize(
    nextWidth / scaleX,
    nextHeight / scaleY,
  );
  return sprite;
}

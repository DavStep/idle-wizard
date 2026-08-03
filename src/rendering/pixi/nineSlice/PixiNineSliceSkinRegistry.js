import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

const BUTTON_SKIN_IDS = [
  PIXI_ROOT_RUN_ASSETS.buttonYellow,
  PIXI_ROOT_RUN_ASSETS.buttonGreenNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
  PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
  PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
];
const SKINS = new Map();

registerSkin(DEFAULT_PIXI_THEME_SNAPSHOT.frames.control, {
  outputInsets: DEFAULT_PIXI_THEME_SNAPSHOT.frames.controlBorder,
  sourceInsets: DEFAULT_PIXI_THEME_SNAPSHOT.frames.controlSourceInsets,
});

for (const assetId of BUTTON_SKIN_IDS) {
  registerSkin(assetId, {
    outputInsets: PIXI_ROOT_RUN_GEOMETRY.button.borderInsets,
    sourceInsets: PIXI_ROOT_RUN_GEOMETRY.button.sourceInsets,
  });
}

registerSkin(PIXI_ROOT_RUN_ASSETS.topHudSettings, {
  outputInsets: divideInsets(uniformInsets(46), 3),
  sourceInsets: uniformInsets(46),
});
registerSkin(PIXI_ROOT_RUN_ASSETS.topHudAvatarFrame, {
  outputInsets: divideInsets({
    top: 54,
    right: 55,
    bottom: 55,
    left: 54,
  }, 3),
  sourceInsets: {
    top: 54,
    right: 55,
    bottom: 55,
    left: 54,
  },
});

export const PIXI_NINE_SLICE_SKINS = Object.freeze(
  [...SKINS.values()],
);

export function getPixiNineSliceSkin(assetId) {
  return SKINS.get(String(assetId ?? '')) ?? null;
}

export function createPixiNineSliceSkin({
  assetId,
  minimumCenter,
  outputInsets,
  sourceInsets,
}) {
  if (!assetId || !sourceInsets || !outputInsets) {
    return null;
  }

  return Object.freeze({
    assetId: String(assetId),
    minimumCenter: minimumCenter
      ? freezeSize(minimumCenter)
      : Object.freeze({ width: 1, height: 1 }),
    outputInsets: freezeInsets(outputInsets),
    sourceInsets: freezeInsets(sourceInsets),
  });
}

function registerSkin(assetId, metrics) {
  const skin = createPixiNineSliceSkin({
    assetId,
    ...metrics,
  });

  if (skin) {
    SKINS.set(skin.assetId, skin);
  }
}

function freezeInsets(value) {
  return Object.freeze({
    top: Math.max(0, Number(value?.top) || 0),
    right: Math.max(0, Number(value?.right) || 0),
    bottom: Math.max(0, Number(value?.bottom) || 0),
    left: Math.max(0, Number(value?.left) || 0),
  });
}

function freezeSize(value) {
  return Object.freeze({
    width: Math.max(0, Number(value?.width) || 0),
    height: Math.max(0, Number(value?.height) || 0),
  });
}

function uniformInsets(value) {
  return {
    top: value,
    right: value,
    bottom: value,
    left: value,
  };
}

function divideInsets(insets, divisor) {
  return {
    top: insets.top / divisor,
    right: insets.right / divisor,
    bottom: insets.bottom / divisor,
    left: insets.left / divisor,
  };
}

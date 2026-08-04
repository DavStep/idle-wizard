import {
  BlurFilter,
  Container,
  Graphics,
  NineSliceSprite,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

const FRAME_VARIANTS = Object.freeze({
  panel: Object.freeze({
    textureKey: 'panel',
    sourceInsetsKey: 'panelSourceInsets',
    borderKey: 'panelBorder',
  }),
});

export class PixiFrame extends Container {
  constructor({
    assetManager = null,
    variant = 'panel',
    width = 100,
    height = 40,
    borderWidth = null,
    fill = true,
    shadow = false,
    label = 'frame',
  } = {}) {
    super();
    this.label = label;
    this.assetManager = assetManager;
    this.variant = variant;
    this.frameWidth = Math.max(0, width);
    this.frameHeight = Math.max(0, height);
    this.borderWidth = borderWidth;
    this.fillEnabled = fill;
    this.shadowEnabled = shadow;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.shadowGraphic = new Graphics();
    this.shadowGraphic.label = `${label}:shadow`;
    this.plainGraphic = new Graphics();
    this.plainGraphic.label = `${label}:plain`;
    this.nineSlice = null;
    this.shadowFilter = shadow ? createShadowFilter() : null;
    if (this.shadowFilter) {
      this.shadowGraphic.filters = [this.shadowFilter];
    }
    this.addChild(this.shadowGraphic, this.plainGraphic);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.redraw();
  }

  setSize(width, height) {
    this.frameWidth = Math.max(0, Number(width) || 0);
    this.frameHeight = Math.max(0, Number(height) || 0);
    this.redraw();
    return this;
  }

  setVariant(variant) {
    if (!(variant in FRAME_VARIANTS)) {
      throw new Error(`Unknown Pixi frame variant: ${variant}`);
    }
    this.variant = variant;
    this.redraw();
    return this;
  }

  setShadow(enabled) {
    this.shadowEnabled = Boolean(enabled);
    if (this.shadowEnabled && !this.shadowFilter) {
      this.shadowFilter = createShadowFilter();
      if (this.shadowFilter) {
        this.shadowGraphic.filters = [this.shadowFilter];
      }
    }
    this.redraw();
    return this;
  }

  redraw() {
    this.drawShadow();
    const frame = FRAME_VARIANTS[this.variant] ?? FRAME_VARIANTS.panel;
    const textureId = this.theme.frames?.[frame.textureKey];

    if (textureId && this.assetManager?.loaded) {
      this.drawNineSlice({
        texture: this.assetManager.getTexture(textureId),
        sourceInsets: this.theme.frames[frame.sourceInsetsKey],
        borderInsets: this.theme.frames[frame.borderKey],
      });
      this.plainGraphic.visible = false;
      return;
    }

    this.removeNineSlice();
    this.plainGraphic.visible = true;
    const borderWidth =
      this.borderWidth ?? PIXI_UI_GEOMETRY.ordinaryBorderWidth;
    this.plainGraphic.clear();
    this.plainGraphic.rect(0, 0, this.frameWidth, this.frameHeight);
    if (this.fillEnabled) {
      this.plainGraphic.fill(this.theme.surface);
    }
    if (borderWidth > 0) {
      this.plainGraphic.stroke({
        color: this.theme.stroke,
        width: borderWidth,
        alignment: 1,
      });
    }
  }

  drawShadow() {
    this.shadowGraphic.clear();
    this.shadowGraphic.visible = this.shadowEnabled;
    if (!this.shadowEnabled) {
      return;
    }
    this.shadowGraphic
      .rect(
        PIXI_UI_GEOMETRY.dialogShadowX,
        PIXI_UI_GEOMETRY.dialogShadowY,
        this.frameWidth,
        this.frameHeight,
      )
      .fill(this.theme.dialogShadow);
  }

  drawNineSlice({ texture, sourceInsets, borderInsets }) {
    if (!sourceInsets || !borderInsets) {
      throw new Error(`Pixi frame "${this.variant}" is missing nine-slice metrics.`);
    }
    if (!this.nineSlice) {
      this.nineSlice = new NineSliceSprite({
        texture,
        leftWidth: sourceInsets.left,
        topHeight: sourceInsets.top,
        rightWidth: sourceInsets.right,
        bottomHeight: sourceInsets.bottom,
        roundPixels: true,
      });
      this.nineSlice.label = `${this.label}:nineSlice`;
      this.addChild(this.nineSlice);
    } else {
      this.nineSlice.texture = texture;
      this.nineSlice.leftWidth = sourceInsets.left;
      this.nineSlice.topHeight = sourceInsets.top;
      this.nineSlice.rightWidth = sourceInsets.right;
      this.nineSlice.bottomHeight = sourceInsets.bottom;
      this.nineSlice.visible = true;
    }

    const scaleX = borderInsets.left / sourceInsets.left;
    const scaleY = borderInsets.top / sourceInsets.top;
    const rightScale = borderInsets.right / sourceInsets.right;
    const bottomScale = borderInsets.bottom / sourceInsets.bottom;
    if (Math.abs(scaleX - rightScale) > 0.0001 || Math.abs(scaleY - bottomScale) > 0.0001) {
      throw new Error('Nine-slice output borders must use symmetric scale ratios.');
    }
    this.nineSlice.scale.set(scaleX, scaleY);
    this.nineSlice.setSize(
      scaleX > 0 ? this.frameWidth / scaleX : this.frameWidth,
      scaleY > 0 ? this.frameHeight / scaleY : this.frameHeight,
    );
  }

  removeNineSlice() {
    if (this.nineSlice) {
      this.nineSlice.visible = false;
    }
  }

  destroy(options) {
    this.shadowFilter?.destroy();
    this.shadowFilter = null;
    super.destroy(options);
  }
}

function createShadowFilter() {
  try {
    return new BlurFilter({
      strength: PIXI_UI_GEOMETRY.dialogShadowBlur,
      quality: 3,
    });
  } catch {
    // Headless layout/unit tests do not expose a WebGL shader probe. The
    // production application constructs views only after its renderer exists.
    return null;
  }
}

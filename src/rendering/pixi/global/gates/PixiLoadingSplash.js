import {
  Container,
  FillGradient,
  Graphics,
  Sprite,
} from 'pixi.js';

import { PixiTextLabel } from '../../primitives/index.js';
import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';

const SPLASH_TEXTURE_ID =
  'source:assets/ui/idle-witch-craft-splash/splash-screen.png';
const SPLASH_IMAGE_ASPECT = 818 / 1923;
const SPLASH_BAR_WIDTH_RATIO = 0.84;
const SPLASH_BAR_BOTTOM_RATIO = 0.0465;
const SPLASH_LABEL_BOTTOM_RATIO = 0.0695;
const SPLASH_PROGRESS_COLORS = Object.freeze([
  Object.freeze({ offset: 0, color: '#7f3cff' }),
  Object.freeze({ offset: 0.48, color: '#d868ff' }),
  Object.freeze({ offset: 0.74, color: '#64caff' }),
  Object.freeze({ offset: 1, color: '#ffd76a' }),
]);

export class PixiLoadingSplash extends Container {
  constructor({ assets } = {}) {
    super({ label: 'loadingSplash' });
    this.projection = null;
    this.progressValue = 0;
    this.background = new Graphics({
      label: 'loadingSplash:background',
    });
    this.art = new Sprite({
      texture: assets.getTexture(SPLASH_TEXTURE_ID),
      label: 'loadingSplash:art',
    });
    this.art.anchor.set(0.5, 0);
    this.verticalShade = new Graphics({
      label: 'loadingSplash:verticalShade',
    });
    this.horizontalShade = new Graphics({
      label: 'loadingSplash:horizontalShade',
    });
    this.loadingLabel = new PixiTextLabel({
      text: 'Loading game',
      fontSize: PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'normal',
      anchor: { x: 0.5, y: 0.5 },
      align: 'center',
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:label',
    });
    this.progressTrack = new Graphics({
      label: 'loadingSplash:progressTrack',
    });
    this.progressFill = new Graphics({
      label: 'loadingSplash:progressFill',
    });
    this.progressGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: SPLASH_PROGRESS_COLORS,
    });
    this.verticalGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: '#05030a38' },
        { offset: 0.22, color: '#05030a00' },
        { offset: 0.66, color: '#05030a00' },
        { offset: 0.88, color: '#07040e57' },
        { offset: 1, color: '#05030ac2' },
      ],
    });
    this.horizontalGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: '#05030a61' },
        { offset: 0.13, color: '#05030a00' },
        { offset: 0.87, color: '#05030a00' },
        { offset: 1, color: '#05030a61' },
      ],
    });
    this.addChild(
      this.background,
      this.art,
      this.verticalShade,
      this.horizontalShade,
      this.loadingLabel,
      this.progressTrack,
      this.progressFill,
    );
  }

  setText(text) {
    this.loadingLabel.setText(text ?? 'Loading game');
  }

  setProgress(value) {
    this.progressValue = Math.max(0, Math.min(1, Number(value) || 0));
    this.redrawProgress();
  }

  applyTheme(theme) {
    this.loadingLabel.applyTheme(theme);
  }

  layout(projection) {
    if (!projection) {
      return;
    }
    this.projection = projection;
    const sourceStageWidth =
      projection.stageLogicalWidth / projection.sourceScale;
    const sourceHeight = projection.sourceHeight;
    const sourceOffsetX = projection.sourceOffsetX;
    const artWidth = getSplashArtWidth(projection);
    const artLeft = PIXI_UI_GEOMETRY.sourceWidth / 2 - artWidth / 2;
    const barWidth = artWidth * SPLASH_BAR_WIDTH_RATIO;
    const barHeight = 13;
    const barX = PIXI_UI_GEOMETRY.sourceWidth / 2 - barWidth / 2;
    const barY = sourceHeight * (1 - SPLASH_BAR_BOTTOM_RATIO) - barHeight;
    const labelY =
      sourceHeight * (1 - SPLASH_LABEL_BOTTOM_RATIO) -
      PIXI_UI_GEOMETRY.bodyFontSize / 2;

    this.background
      .clear()
      .rect(-sourceOffsetX, 0, sourceStageWidth, sourceHeight)
      .fill('#07040e');
    this.art.position.set(PIXI_UI_GEOMETRY.sourceWidth / 2, 0);
    this.art.width = artWidth;
    this.art.height = sourceHeight;
    this.verticalShade
      .clear()
      .rect(artLeft, 0, artWidth, sourceHeight)
      .fill(this.verticalGradient);
    this.horizontalShade
      .clear()
      .rect(artLeft, 0, artWidth, sourceHeight)
      .fill(this.horizontalGradient);
    this.loadingLabel.position.set(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
      labelY,
    );
    this.progressTrack
      .clear()
      .rect(barX, barY, barWidth, barHeight)
      .fill('#080611')
      .stroke({ color: '#07030c', width: 2, alignment: 1 })
      .rect(barX + 2, barY + 2, barWidth - 4, barHeight - 4)
      .stroke({ color: '#3f2258', width: 1, alignment: 1 });
    this.redrawProgress({
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight,
    });
  }

  redrawProgress(bounds = null) {
    if (!this.projection) {
      return;
    }
    const sourceHeight = this.projection.sourceHeight;
    const artWidth = getSplashArtWidth(this.projection);
    const width = bounds?.width ?? artWidth * SPLASH_BAR_WIDTH_RATIO;
    const height = bounds?.height ?? 13;
    const x =
      bounds?.x ?? PIXI_UI_GEOMETRY.sourceWidth / 2 - width / 2;
    const y =
      bounds?.y ??
      sourceHeight * (1 - SPLASH_BAR_BOTTOM_RATIO) - height;
    const inset = 4;
    const fillWidth = Math.max(
      0,
      (width - inset * 2) * this.progressValue,
    );

    this.progressFill.clear();
    if (fillWidth <= 0) {
      return;
    }
    this.progressFill
      .rect(
        x + inset,
        y + inset,
        fillWidth,
        Math.max(1, height - inset * 2),
      )
      .fill(this.progressGradient);
  }

  destroy(options) {
    this.progressGradient.destroy();
    this.verticalGradient.destroy();
    this.horizontalGradient.destroy();
    super.destroy(options);
  }
}

function getSplashArtWidth(projection) {
  const sourceStageWidth =
    projection.stageLogicalWidth / projection.sourceScale;
  const viewportWidth = Math.max(1, projection.viewportPx?.width ?? 1);
  const viewportHeight = Math.max(1, projection.viewportPx?.height ?? 1);
  const sourceUnitsPerPixel = sourceStageWidth / viewportWidth;
  const targetPixelWidth = Math.min(
    viewportWidth,
    viewportHeight * SPLASH_IMAGE_ASPECT,
  );
  return targetPixelWidth * sourceUnitsPerPixel;
}

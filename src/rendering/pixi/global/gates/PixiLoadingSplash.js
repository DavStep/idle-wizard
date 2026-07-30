import {
  Container,
  FillGradient,
  Graphics,
  Sprite,
} from 'pixi.js';

import {
  PixiProgressBar,
  PixiTextLabel,
} from '../../primitives/index.js';
import {
  createPixiThemeSnapshot,
  PIXI_FONT_FAMILIES,
  PIXI_UI_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const SPLASH_TEXTURE_ID =
  'source:assets/ui/idle-witch-craft-splash/splash-screen.png';
const SPLASH_IMAGE_ASPECT = 818 / 1923;
const SPLASH_BAR_WIDTH_RATIO = 0.84;
const SPLASH_BAR_BOTTOM_RATIO = 0.0465;
const SPLASH_LABEL_BOTTOM_RATIO = 0.0695;
const SPLASH_PROGRESS_THEME = createPixiThemeSnapshot({
  progressBar: 'gradient',
});

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
      fontFamily: PIXI_FONT_FAMILIES['lilita-one'],
      anchor: { x: 0.5, y: 0.5 },
      align: 'center',
      color: '#fff0bf',
      stroke: { color: '#05030a', width: 2 },
      label: 'loadingSplash:label',
    });
    this.progressBar = new PixiProgressBar({
      assetManager: assets,
      width: 0,
      height: PIXI_UI_GEOMETRY.progressTotalHeight,
      label: 'loadingSplash:progress',
    });
    this.progressBar.applyTheme(SPLASH_PROGRESS_THEME);
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
      this.progressBar,
    );
  }

  setText(text) {
    this.loadingLabel.setText(text ?? 'Loading game');
  }

  setProgress(value) {
    this.progressValue = Math.max(0, Math.min(1, Number(value) || 0));
    this.progressBar.setProgress(this.progressValue);
  }

  applyTheme(theme) {
    this.loadingLabel.applyTheme(theme);
    this.progressBar.applyTheme({
      ...theme,
      progress: SPLASH_PROGRESS_THEME.progress,
    });
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
    const barHeight = PIXI_UI_GEOMETRY.progressTotalHeight;
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
    this.art.height = artWidth / SPLASH_IMAGE_ASPECT;
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
    this.progressBar.position.set(barX, barY);
    this.progressBar.setSize(barWidth, barHeight);
    this.progressBar.setProgress(this.progressValue);
  }

  destroy(options) {
    this.verticalGradient.destroy();
    this.horizontalGradient.destroy();
    super.destroy(options);
  }
}

function getSplashArtWidth(projection) {
  return projection.stageLogicalWidth / projection.sourceScale;
}

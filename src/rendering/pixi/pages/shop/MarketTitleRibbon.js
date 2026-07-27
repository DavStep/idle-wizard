import { Container, Texture } from 'pixi.js';

import { PixiNineSliceFrame } from '../../primitives/PixiNineSliceFrame.js';
import { PixiStarLevelLabel } from '../../primitives/PixiStarLevelLabel.js';
import { PixiTextLabel } from '../../primitives/PixiTextLabel.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../../theme/PixiThemeTokens.js';

const TITLE_TEXT = '#ffffff';
const TITLE_STROKE = '#160e19';

/**
 * Static Market licence identity ribbon.
 *
 * The title and all three star slots are measured together and optically
 * centered on the ribbon's raised front panel.
 */
export class MarketTitleRibbon {
  constructor({ assetManager = null } = {}) {
    this.assetManager = assetManager;
    this.geometry = PIXI_ROOT_RUN_GEOMETRY.marketTitleRibbon;
    this.assetId = PIXI_ROOT_RUN_ASSETS.marketTitleRibbon;
    this.width = this.geometry.width;
    this.height = this.geometry.height;
    this.contentGroupLeft = 0;
    this.contentGroupRight = 0;
    this.contentGroupCenterX = 0;

    this.root = new Container({ label: 'shop:marketTitleRibbon' });
    this.frame = new PixiNineSliceFrame({
      texture: this.resolveTexture(this.assetId),
      sourceInsets: this.geometry.sourceInsets,
      borderInsets: this.geometry.borderInsets,
      width: this.width,
      height: this.height,
      label: 'shop:marketTitleRibbon:frame',
    });
    this.title = new PixiTextLabel({
      fontSize: this.geometry.titleFontSize,
      fontWeight: 'normal',
      lineHeight: this.geometry.titleLineHeight,
      color: TITLE_TEXT,
      stroke: {
        color: TITLE_STROKE,
        width: this.geometry.titleStroke,
      },
      anchor: { x: 0.5, y: 0.5 },
      label: 'shop:marketTitleRibbon:title',
    });
    this.stars = new PixiStarLevelLabel({
      assetManager,
      size: this.geometry.starSize,
      gap: this.geometry.starGap,
      label: 'shop:marketTitleRibbon:stars',
    });
    this.root.addChild(this.frame, this.title, this.stars);
    this.layout();
  }

  bind(label, rank) {
    this.title
      .setFontSize(this.geometry.titleFontSize)
      .setLineHeight(this.geometry.titleLineHeight)
      .setText(label);
    this.stars.setLevel(rank);
    this.layout();
  }

  setMaxWidth(maxWidth) {
    this.width = Math.min(
      this.geometry.width,
      Math.max(
        this.geometry.sourceInsets.left +
          this.geometry.sourceInsets.right +
          1,
        Number(maxWidth) || this.geometry.width,
      ),
    );
    this.layout();
  }

  layout() {
    const geometry = this.geometry;
    this.frame.setSize(
      this.width,
      this.height,
      geometry.borderInsets,
    );
    let fontSize = geometry.titleFontSize;
    this.title
      .setFontSize(fontSize)
      .setLineHeight(geometry.titleLineHeight);
    const availableContentWidth = Math.max(
      0,
      this.width - geometry.contentInsetX * 2,
    );
    while (
      this.measureContentWidth() > availableContentWidth &&
      fontSize > geometry.titleMinFontSize
    ) {
      fontSize -= 1;
      this.title
        .setFontSize(fontSize)
        .setLineHeight(
          geometry.titleLineHeight *
            (fontSize / geometry.titleFontSize),
        );
    }

    const contentWidth = this.measureContentWidth();
    this.contentGroupLeft = (this.width - contentWidth) / 2;
    this.contentGroupRight = this.contentGroupLeft + contentWidth;
    this.contentGroupCenterX =
      (this.contentGroupLeft + this.contentGroupRight) / 2;
    const contentCenterY =
      this.height / 2 + geometry.contentOffsetY;
    this.title.position.set(
      this.contentGroupLeft + this.title.measuredWidth / 2,
      contentCenterY,
    );
    this.stars.position.set(
      this.contentGroupLeft +
        this.title.measuredWidth +
        geometry.contentGap,
      contentCenterY - this.stars.starSize / 2,
    );
  }

  measureContentWidth() {
    return (
      this.title.measuredWidth +
      this.geometry.contentGap +
      this.stars.measuredWidth
    );
  }

  resolveTexture(assetId) {
    return this.assetManager?.getTexture?.(assetId) ?? Texture.EMPTY;
  }
}

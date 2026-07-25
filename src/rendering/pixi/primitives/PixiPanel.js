import { Container, Graphics } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiFrame } from './PixiFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

export class PixiPanel extends Container {
  constructor({
    assetManager = null,
    title = '',
    contentWidth = 280,
    contentHeight = 20,
    paddingX = PIXI_UI_GEOMETRY.panelPaddingX,
    paddingY = PIXI_UI_GEOMETRY.panelPaddingY,
    borderWidth = PIXI_UI_GEOMETRY.ordinaryBorderWidth,
    variant = 'panel',
    dialog = false,
    label = 'panel',
  } = {}) {
    super();
    this.label = label;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.contentWidth = contentWidth;
    this.contentHeight = contentHeight;
    this.paddingX = dialog ? PIXI_UI_GEOMETRY.dialogPadding : paddingX;
    this.paddingY = dialog ? PIXI_UI_GEOMETRY.dialogPadding : paddingY;
    this.borderWidth = dialog ? PIXI_UI_GEOMETRY.strongBorderWidth : borderWidth;
    this.dialog = dialog;
    this.frame = new PixiFrame({
      assetManager,
      variant,
      borderWidth: this.borderWidth,
      shadow: dialog,
      label: `${label}:frame`,
    });
    this.content = new Container();
    this.content.label = `${label}:content`;
    this.titleBacking = new Graphics();
    this.titleBacking.label = `${label}:titleBacking`;
    this.titleLabel = new PixiTextLabel({
      text: title,
      fontSize: dialog
        ? PIXI_UI_GEOMETRY.dialogTitleFontSize
        : PIXI_UI_GEOMETRY.bodyFontSize,
      fontWeight: 'bold',
      stroke: dialog ? null : { color: this.theme.surface, width: 2 },
      label: `${label}:title`,
    });
    this.addChild(this.frame, this.content, this.titleBacking, this.titleLabel);
    this.setTitle(title);
    this.relayout();
  }

  setTitle(title) {
    this.titleLabel.setText(title);
    const visible = String(title ?? '').length > 0;
    this.titleLabel.visible = visible;
    this.titleBacking.visible = visible && this.dialog;
    this.redrawTitleBacking();
    return this;
  }

  setContentSize(width, height) {
    this.contentWidth = Math.max(0, Number(width) || 0);
    this.contentHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  setOuterSize(width, height) {
    const horizontal = (this.paddingX + this.borderWidth) * 2;
    const vertical = (this.paddingY + this.borderWidth) * 2;
    return this.setContentSize(
      Math.max(0, width - horizontal),
      Math.max(0, height - vertical),
    );
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.frame.applyTheme(this.theme);
    this.titleLabel.applyTheme(this.theme);
    if (!this.dialog) {
      this.titleLabel.setStroke({ color: this.theme.surface, width: 2 });
    }
    this.redrawTitleBacking();
  }

  relayout() {
    this.content.position.set(
      this.borderWidth + this.paddingX,
      this.borderWidth + this.paddingY,
    );
    this.frame.setSize(this.outerWidth, this.outerHeight);
    this.titleLabel.position.set(
      8,
      -12,
    );
    this.redrawTitleBacking();
  }

  redrawTitleBacking() {
    this.titleBacking.clear();
    if (!this.titleBacking.visible || !this.dialog) {
      return;
    }
    const x = this.titleLabel.x - PIXI_UI_GEOMETRY.borderLabelFontSize / 5;
    const y = this.titleLabel.y + 1;
    const width = this.titleLabel.measuredWidth + 4;
    const height = Math.max(
      PIXI_UI_GEOMETRY.borderLabelLineHeight,
      this.titleLabel.measuredHeight - 1,
    );
    this.titleBacking.rect(x, y, width, height).fill(this.theme.surface);
  }

  get outerWidth() {
    return this.contentWidth + (this.paddingX + this.borderWidth) * 2;
  }

  get outerHeight() {
    return this.contentHeight + (this.paddingY + this.borderWidth) * 2;
  }
}

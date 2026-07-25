import { Container, FillGradient, Graphics } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';

export class PixiProgressBar extends Container {
  constructor({
    width = 100,
    height = PIXI_UI_GEOMETRY.progressTotalHeight,
    progress = 0,
    tone = 'root',
    label = 'progress',
  } = {}) {
    super();
    this.label = label;
    this.barWidth = width;
    this.barHeight = height;
    this.tone = normalizeProgressTone(tone);
    this.start = 0;
    this.end = clamp01(progress);
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.railGraphic = new Graphics();
    this.railGraphic.label = `${label}:rail`;
    this.fillGraphic = new Graphics();
    this.fillGraphic.label = `${label}:fill`;
    this.gradient = null;
    this.fillColor = null;
    this.fillEdgeColor = null;
    this.addChild(this.railGraphic, this.fillGraphic);
    this.redraw();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.rebuildGradient();
    this.redrawFill();
    return this;
  }

  setTone(tone) {
    this.tone = normalizeProgressTone(tone);
    this.redrawFill();
    return this;
  }

  setProgress(progress) {
    this.start = 0;
    this.end = clamp01(progress);
    this.redrawFill();
    return this;
  }

  setRange(start, end) {
    this.start = clamp01(start);
    this.end = Math.max(this.start, clamp01(end));
    this.redrawFill();
    return this;
  }

  setSize(width, height = this.barHeight) {
    this.barWidth = Math.max(0, Number(width) || 0);
    this.barHeight = Math.max(0, Number(height) || 0);
    this.redraw();
    return this;
  }

  rebuildGradient() {
    this.gradient?.destroy();
    this.gradient = null;
    if (this.theme.progress?.key !== 'gradient') {
      return;
    }
    this.gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: 'local',
      colorStops: this.theme.progress.colors.map((color, index) => ({
        color,
        offset: this.theme.progress.stops[index],
      })),
    });
  }

  redraw() {
    this.redrawRail();
    this.redrawFill();
  }

  redrawFill() {
    this.fillGraphic.clear();
    const border = PIXI_UI_GEOMETRY.progressRailBorderWidth;
    const innerWidth = Math.max(0, this.barWidth - border * 2);
    const innerHeight = Math.max(0, this.barHeight - border * 2);
    const fillWidth = innerWidth * (this.end - this.start);
    const visual = this.resolveFillVisual();
    this.fillColor = visual.fill;
    this.fillEdgeColor = visual.edge;
    if (fillWidth <= 0 || innerHeight <= 0) {
      return;
    }

    const fillX = border + innerWidth * this.start;
    const radius = Math.min(innerHeight / 2, fillWidth / 2);
    this.fillGraphic
      .roundRect(fillX, border, fillWidth, innerHeight, radius)
      .fill(visual.fill);

    if (this.theme.progress?.key === 'notched') {
      this.fillGraphic
        .moveTo(fillX + radius, border + 0.5)
        .lineTo(fillX + fillWidth - radius, border + 0.5)
        .stroke({
          color: this.theme.progress.insetTop,
          width: 1,
        });
      this.fillGraphic
        .moveTo(fillX + radius, border + innerHeight - 0.5)
        .lineTo(fillX + fillWidth - radius, border + innerHeight - 0.5)
        .stroke({
          color: this.theme.progress.insetBottom,
          width: 1,
        });
      return;
    }

    if (visual.edge) {
      this.fillGraphic
        .roundRect(fillX, border, fillWidth, innerHeight, radius)
        .stroke({
          color: visual.edge,
          width: 1,
          alignment: 1,
        });
    }
  }

  redrawRail() {
    this.railGraphic.clear();
    const width = this.barWidth;
    const height = this.barHeight;
    const border = PIXI_UI_GEOMETRY.progressRailBorderWidth;
    if (width <= 0 || height <= 0) {
      return;
    }

    const radius = Math.min(width / 2, height / 2);
    this.railGraphic
      .roundRect(0, 0, width, height, radius)
      .fill({
        color: PIXI_PROGRESS_VISUALS.railBackground,
        alpha: PIXI_PROGRESS_VISUALS.railBackgroundAlpha,
      })
      .roundRect(0, 0, width, height, radius)
      .stroke({
        color: PIXI_PROGRESS_VISUALS.railBorder,
        width: border,
        alignment: 1,
      });

    const innerWidth = Math.max(0, width - border * 2);
    const innerHeight = Math.max(0, height - border * 2);
    if (innerWidth <= 0 || innerHeight <= 0) {
      return;
    }

    const innerRadius = Math.min(innerWidth / 2, innerHeight / 2);
    this.railGraphic
      .roundRect(border, border, innerWidth, innerHeight, innerRadius)
      .stroke({
        color: PIXI_PROGRESS_VISUALS.railInset,
        alpha: PIXI_PROGRESS_VISUALS.railInsetAlpha,
        width: 1,
        alignment: 1,
      });
  }

  resolveFillVisual() {
    const progressKey = this.theme.progress?.key;
    if (progressKey === 'gradient') {
      return {
        fill: this.gradient ?? PIXI_PROGRESS_VISUALS.tones.root.fill,
        edge: PIXI_PROGRESS_VISUALS.tones.root.edge,
      };
    }
    if (progressKey === 'notched') {
      return {
        fill:
          this.theme.progress?.colors?.[0] ??
          PIXI_PROGRESS_VISUALS.tones.root.fill,
        edge: null,
      };
    }
    const tone =
      PIXI_PROGRESS_VISUALS.tones[this.tone] ??
      PIXI_PROGRESS_VISUALS.tones.root;
    return {
      fill: tone.fill,
      edge: tone.edge,
    };
  }

  destroy(options) {
    this.gradient?.destroy();
    this.gradient = null;
    super.destroy(options);
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizeProgressTone(tone) {
  return Object.hasOwn(PIXI_PROGRESS_VISUALS.tones, tone)
    ? tone
    : 'root';
}

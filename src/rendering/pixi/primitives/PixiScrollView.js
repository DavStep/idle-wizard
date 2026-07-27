import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiProgressBar } from './PixiProgressBar.js';

export class PixiScrollView extends Container {
  constructor({
    inputRouter = null,
    assetManager = null,
    width = 280,
    height = 200,
    contentPaddingTop = 0,
    showProgress = false,
    progressTone = 'root',
    virtualize = null,
    label = 'scrollView',
  } = {}) {
    super();
    this.label = label;
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.contentHeight = 0;
    this.contentPaddingTop = Math.max(
      0,
      Number(contentPaddingTop) || 0,
    );
    this.scrollY = 0;
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.virtualize = virtualize;
    this.viewport = new Container();
    this.viewport.label = `${label}:viewport`;
    this.content = new Container();
    this.content.label = `${label}:content`;
    this.content.y = this.contentPaddingTop;
    this.maskGraphic = new Graphics();
    this.maskGraphic.label = `${label}:mask`;
    this.fadeGraphic = new Graphics();
    this.fadeGraphic.label = `${label}:fade`;
    this.progressBar = showProgress
      ? new PixiProgressBar({
          assetManager,
          width,
          tone: progressTone,
          label: `${label}:progress`,
        })
      : null;
    this.viewport.addChild(this.content);
    this.addChild(this.viewport, this.maskGraphic, this.fadeGraphic);
    if (this.progressBar) {
      this.addChild(this.progressBar);
    }
    this.viewport.mask = this.maskGraphic;
    this.registration = inputRouter?.registerGestureSurface?.(this, {
      kind: 'scroll',
      axis: 'y',
      canStart: () => this.maxScrollY > 0,
      onMove: ({ deltaY }) => this.scrollBy(-deltaY),
      onWheel: ({ deltaY }) => this.scrollBy(deltaY),
    }) ?? null;
    this.fadeGradient = null;
    this.relayout();
  }

  applyTheme(theme) {
    this.theme = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.progressBar?.applyTheme(this.theme);
    this.rebuildFadeGradient();
    this.redrawFade();
  }

  setViewportSize(width, height) {
    this.viewportWidth = Math.max(0, Number(width) || 0);
    this.viewportHeight = Math.max(0, Number(height) || 0);
    this.relayout();
    return this;
  }

  setContentHeight(height) {
    this.contentHeight = Math.max(0, Number(height) || 0);
    const changed = this.scrollTo(this.scrollY);
    this.updateProgress();
    this.redrawFade();
    return changed;
  }

  scrollTo(y) {
    const next = Math.max(0, Math.min(this.maxScrollY, Number(y) || 0));
    const contentY = this.contentPaddingTop - next;
    if (next === this.scrollY && this.content.y === contentY) {
      return false;
    }
    this.scrollY = next;
    this.content.y = contentY;
    this.virtualize?.({
      scrollY: this.scrollY,
      viewportHeight: this.viewportHeight,
      contentHeight: this.contentHeight,
    });
    this.updateProgress();
    this.redrawFade();
    return true;
  }

  scrollBy(deltaY) {
    return this.scrollTo(this.scrollY + (Number(deltaY) || 0));
  }

  relayout() {
    this.maskGraphic
      .clear()
      .rect(0, 0, this.viewportWidth, this.viewportHeight)
      .fill('#ffffff');
    this.hitArea = new Rectangle(0, 0, this.viewportWidth, this.viewportHeight);
    this.eventMode = 'static';
    if (this.progressBar) {
      this.progressBar.setSize(this.viewportWidth);
      this.progressBar.y =
        this.viewportHeight + PIXI_UI_GEOMETRY.roomChatGap + 2;
    }
    this.scrollTo(this.scrollY);
    this.updateProgress();
    this.redrawFade();
  }

  rebuildFadeGradient() {
    this.fadeGradient?.destroy();
    this.fadeGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: `${this.theme.surface}00` },
        { offset: 1, color: `${this.theme.surface}b8` },
      ],
    });
  }

  redrawFade() {
    this.fadeGraphic.clear();
    if (
      this.scrollY >= this.maxScrollY ||
      this.maxScrollY <= this.contentPaddingTop
    ) {
      return;
    }
    const height = Math.min(64, this.viewportHeight);
    this.fadeGraphic
      .rect(0, this.viewportHeight - height, this.viewportWidth, height)
      .fill(this.fadeGradient ?? this.theme.surface);
  }

  updateProgress() {
    if (!this.progressBar) {
      return;
    }
    const ratio = this.maxScrollY <= 0 ? 1 : this.scrollY / this.maxScrollY;
    this.progressBar.visible =
      this.maxScrollY > this.contentPaddingTop;
    this.progressBar.setProgress(ratio);
  }

  get maxScrollY() {
    return Math.max(
      0,
      this.contentPaddingTop +
        this.contentHeight -
        this.viewportHeight,
    );
  }

  destroy(options) {
    this.registration?.();
    this.registration = null;
    this.fadeGradient?.destroy();
    this.fadeGradient = null;
    super.destroy(options);
  }
}

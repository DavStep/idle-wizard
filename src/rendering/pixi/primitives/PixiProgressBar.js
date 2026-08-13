import {
  AlphaMask,
  Container,
  FillGradient,
  Graphics,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_PROGRESS_VISUALS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import {
  createPixiCapsuleSlice,
  setPixiCapsuleBounds,
} from './PixiCapsuleSkin.js';

export class PixiProgressBar extends Container {
  constructor({
    assetManager = null,
    width = 100,
    height = PIXI_UI_GEOMETRY.progressTotalHeight,
    progress = 0,
    tone = 'root',
    usePlayerStyle = true,
    allowPartialAssets = false,
    label = 'progress',
  } = {}) {
    super();
    this.label = label;
    this.barWidth = width;
    this.barHeight = height;
    this.tone = normalizeProgressTone(tone);
    this.usePlayerStyle = Boolean(usePlayerStyle);
    this.start = 0;
    this.end = clamp01(progress);
    this.theme = DEFAULT_PIXI_THEME_SNAPSHOT;
    this.railGraphic = createPixiCapsuleSlice({
      assetManager,
      kind: 'track',
      label: `${label}:rail`,
      allowPartialAssets,
    });
    this.fillGraphic = new Graphics();
    this.fillGraphic.label = `${label}:fill`;
    this.fillContainer = new Container({
      label: `${label}:fillContainer`,
    });
    this.fillMask = createPixiCapsuleSlice({
      assetManager,
      kind: 'fillMask',
      label: `${label}:fillMask`,
      allowPartialAssets,
    });
    this.fillAlphaMask = new AlphaMask({
      mask: this.fillMask,
    });
    this.fillAlphaMask.channel = 'alpha';
    this.fillGraphic.setMask({ channel: 'alpha' });
    this.fillGraphic.addEffect(this.fillAlphaMask);
    this.fillContainer.addChild(
      this.fillGraphic,
      this.fillMask,
    );
    this.gradient = null;
    this.fillColor = null;
    this.fillEdgeColor = null;
    this.addChild(
      this.railGraphic,
      this.fillContainer,
    );
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
    if (this.getProgressStyleKey() !== 'gradient') {
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
      this.fillMask.visible = false;
      return;
    }

    const fillX = border + innerWidth * this.start;
    const fillRadius = Math.min(fillWidth / 2, innerHeight / 2);
    setPixiCapsuleBounds(this.fillMask, {
      x: fillX,
      y: border,
      width: fillWidth,
      height: innerHeight,
      kind: 'fillMask',
    });

    if (this.getProgressStyleKey() === 'notched') {
      this.fillGraphic
        .roundRect(fillX, border, fillWidth, innerHeight, fillRadius)
        .fill(visual.fill)
        .moveTo(fillX, border + 0.5)
        .lineTo(fillX + fillWidth, border + 0.5)
        .stroke({
          color: this.theme.progress.insetTop,
          width: 1,
        });
      this.fillGraphic
        .moveTo(fillX, border + innerHeight - 0.5)
        .lineTo(fillX + fillWidth, border + innerHeight - 0.5)
        .stroke({
          color: this.theme.progress.insetBottom,
          width: 1,
        });
      return;
    }

    if (visual.edge) {
      this.fillGraphic
        .roundRect(fillX, border, fillWidth, innerHeight, fillRadius)
        .fill(visual.edge);
      const inset = Math.min(
        1,
        fillWidth / 2,
        innerHeight / 2,
      );
      const insetWidth = Math.max(0, fillWidth - inset * 2);
      const insetHeight = Math.max(0, innerHeight - inset * 2);
      this.fillGraphic
        .roundRect(
          fillX + inset,
          border + inset,
          insetWidth,
          insetHeight,
          Math.min(insetWidth / 2, insetHeight / 2),
        )
        .fill(visual.fill);
      return;
    }

    this.fillGraphic
      .roundRect(fillX, border, fillWidth, innerHeight, fillRadius)
      .fill(visual.fill);
  }

  redrawRail() {
    const width = this.barWidth;
    const height = this.barHeight;
    if (width <= 0 || height <= 0) {
      this.railGraphic.visible = false;
      return;
    }

    setPixiCapsuleBounds(this.railGraphic, {
      width,
      height,
      kind: 'track',
    });
  }

  resolveFillVisual() {
    const progressKey = this.getProgressStyleKey();
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

  getProgressStyleKey() {
    return this.usePlayerStyle ? this.theme.progress?.key : null;
  }

  destroy(options) {
    this.gradient?.destroy();
    this.gradient = null;
    this.fillGraphic.removeEffect(this.fillAlphaMask);
    this.fillAlphaMask.destroy();
    this.fillAlphaMask = null;
    super.destroy(options);
  }
}

export class PixiTimedProgressBar extends PixiProgressBar {
  constructor(options = {}) {
    super(options);
    this.startedAtMs = null;
    this.durationMs = 0;
  }

  setTimer({
    startedAtMs,
    durationMs,
  } = {}) {
    const nextStartedAtMs = Number(startedAtMs);
    const nextDurationMs = Math.max(0, Number(durationMs) || 0);
    if (
      !Number.isFinite(nextStartedAtMs) ||
      nextDurationMs <= 0
    ) {
      return this.clearTimer(0);
    }

    this.startedAtMs =
      this.durationMs === nextDurationMs &&
      Number.isFinite(this.startedAtMs) &&
      this.end < 1
        ? Math.min(this.startedAtMs, nextStartedAtMs)
        : nextStartedAtMs;
    this.durationMs = nextDurationMs;
    return this;
  }

  updateTimer(now = Date.now()) {
    const snapshot = this.getTimerSnapshot(now);
    if (Math.abs(this.end - snapshot.progress) > 0.000001) {
      super.setProgress(snapshot.progress);
    }
    return snapshot;
  }

  getTimerSnapshot(now = Date.now()) {
    if (
      !Number.isFinite(this.startedAtMs) ||
      this.durationMs <= 0
    ) {
      return {
        progress: this.end,
        remainingMs: 0,
        complete: this.end >= 1,
      };
    }

    const elapsedMs = Math.max(
      0,
      Number(now) - this.startedAtMs,
    );
    const remainingMs = Math.max(
      0,
      this.durationMs - elapsedMs,
    );
    const progress = clamp01(elapsedMs / this.durationMs);
    return {
      progress,
      remainingMs,
      complete: remainingMs <= 0,
    };
  }

  clearTimer(progress = 0) {
    this.startedAtMs = null;
    this.durationMs = 0;
    super.setProgress(progress);
    return this;
  }

  setProgress(progress) {
    return this.clearTimer(progress);
  }
}

export function createTimedProgressWindow(
  timer = {},
  now = Date.now(),
) {
  const durationMs = Math.max(
    0,
    Number(timer.durationMs ?? timer.totalMs) || 0,
  );
  const snapshotProgress = getTimedProgressSnapshotProgress(timer);
  const fallbackRemainingMs =
    durationMs * (1 - snapshotProgress);
  const remainingMs = Math.max(
    0,
    Math.min(
      durationMs,
      Number.isFinite(Number(timer.remainingMs))
        ? Number(timer.remainingMs)
        : fallbackRemainingMs,
    ),
  );
  const explicitStartedAtMs = Number(timer.startedAtMs);
  const explicitEndTimeMs = Number(
    timer.endTimeMs ?? timer.endsAt,
  );
  const startedAtMs = Number.isFinite(explicitStartedAtMs)
    ? explicitStartedAtMs
    : Number.isFinite(explicitEndTimeMs)
      ? explicitEndTimeMs - durationMs
      : Number(now) - (durationMs - remainingMs);

  return {
    startedAtMs,
    durationMs,
  };
}

export function getTimedProgressSnapshotProgress(timer = {}) {
  const durationMs = Math.max(
    0,
    Number(timer.durationMs ?? timer.totalMs) || 0,
  );
  const remainingMs = Number(timer.remainingMs);
  if (durationMs > 0 && Number.isFinite(remainingMs)) {
    return clamp01(1 - remainingMs / durationMs);
  }
  return clamp01(timer.progress);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizeProgressTone(tone) {
  return Object.hasOwn(PIXI_PROGRESS_VISUALS.tones, tone)
    ? tone
    : 'root';
}

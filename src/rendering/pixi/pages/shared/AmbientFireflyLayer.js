import { Container, Graphics } from 'pixi.js';

import { PIXI_UI_GEOMETRY } from '../../theme/PixiThemeTokens.js';

export const AMBIENT_FIREFLY_COUNT = 9;

const DEFAULT_FIREFLY_PATHS = Object.freeze([
  Object.freeze({ x: 0.13, y: 0.12, radiusX: 18, radiusY: 13, speed: 0.63, phase: 0.2 }),
  Object.freeze({ x: 0.28, y: 0.3, radiusX: 24, radiusY: 17, speed: 0.48, phase: 1.3 }),
  Object.freeze({ x: 0.42, y: 0.18, radiusX: 16, radiusY: 22, speed: 0.56, phase: 2.6 }),
  Object.freeze({ x: 0.57, y: 0.42, radiusX: 21, radiusY: 16, speed: 0.44, phase: 3.7 }),
  Object.freeze({ x: 0.7, y: 0.25, radiusX: 19, radiusY: 14, speed: 0.59, phase: 4.8 }),
  Object.freeze({ x: 0.86, y: 0.1, radiusX: 14, radiusY: 20, speed: 0.51, phase: 5.9 }),
  Object.freeze({ x: 0.2, y: 0.66, radiusX: 25, radiusY: 18, speed: 0.4, phase: 2.1 }),
  Object.freeze({ x: 0.78, y: 0.7, radiusX: 22, radiusY: 15, speed: 0.46, phase: 4.2 }),
  Object.freeze({ x: 0.5, y: 0.82, radiusX: 18, radiusY: 12, speed: 0.54, phase: 0.9 }),
]);

const DEFAULT_FIELD = Object.freeze({
  top: 120,
  bottomInset: 188,
  maxBottom: 610,
});

export class AmbientFireflyLayer {
  constructor({
    label = 'room',
    field = DEFAULT_FIELD,
    phaseOffset = 0,
    intensity = 1,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    timeSource = defaultTimeSource,
    reducedMotion = prefersReducedMotion,
  } = {}) {
    this.field = { ...DEFAULT_FIELD, ...field };
    this.phaseOffset = finiteOr(phaseOffset, 0);
    this.intensity = Math.max(0, finiteOr(intensity, 1));
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.timeSource = timeSource;
    this.reducedMotion =
      typeof reducedMotion === 'function' ? reducedMotion : () => Boolean(reducedMotion);
    this.active = false;
    this.frame = 0;
    this.startedAt = 0;
    this.width = PIXI_UI_GEOMETRY.sourceWidth;
    this.height = PIXI_UI_GEOMETRY.sourceHeight;
    this.themeAlpha = 1;
    this.root = new Container({ label: `${label}-fireflies` });
    this.root.eventMode = 'none';
    this.fireflies = DEFAULT_FIREFLY_PATHS.map((path, index) => {
      const graphic = new Graphics({ label: `${label}-firefly-${index + 1}` });
      graphic
        .circle(0, 0, 4.5)
        .fill({ color: 0xffd85f, alpha: 0.12 })
        .circle(0, 0, 2.4)
        .fill({ color: 0xffe982, alpha: 0.24 })
        .circle(0, 0, 1.15)
        .fill({ color: 0xffffc4, alpha: 0.96 });
      graphic.eventMode = 'none';
      this.root.addChild(graphic);
      return { graphic, path };
    });
    this.tick = (timestamp) => this.updateFrame(timestamp);
    this.renderAt(0, { static: true });
  }

  applyTheme(theme) {
    this.themeAlpha = theme?.key === 'day' ? 0.58 : 1;
    this.renderCurrentFrame();
  }

  setBounds(width, height) {
    this.width = Math.max(1, finiteOr(width, PIXI_UI_GEOMETRY.sourceWidth));
    this.height = Math.max(1, finiteOr(height, PIXI_UI_GEOMETRY.sourceHeight));
    this.renderCurrentFrame();
  }

  setActive(active) {
    const nextActive = Boolean(active);
    if (this.active === nextActive) {
      return;
    }

    this.active = nextActive;
    this.stopFrame();
    if (!this.active || this.reducedMotion()) {
      this.renderAt(0, { static: true });
      return;
    }

    this.startedAt = this.timeSource();
    this.renderAt(0);
    this.frame = this.requestFrame(this.tick);
  }

  updateFrame(timestamp) {
    this.frame = 0;
    if (!this.active || this.reducedMotion()) {
      this.renderAt(0, { static: true });
      return;
    }

    this.renderAt(Math.max(0, finiteOr(timestamp, this.timeSource()) - this.startedAt));
    this.frame = this.requestFrame(this.tick);
  }

  renderCurrentFrame() {
    const elapsed = this.active
      ? Math.max(0, this.timeSource() - this.startedAt)
      : 0;
    this.renderAt(elapsed, {
      static: !this.active || this.reducedMotion(),
    });
  }

  renderAt(elapsedMs, { static: staticFrame = false } = {}) {
    const elapsedSeconds = Math.max(0, elapsedMs) / 1000;
    const fieldBottom = Math.max(
      this.field.top + 1,
      Math.min(this.field.maxBottom, this.height - this.field.bottomInset),
    );
    const fieldHeight = fieldBottom - this.field.top;

    for (const { graphic, path } of this.fireflies) {
      const phase = path.phase + this.phaseOffset;
      const baseX = this.width * path.x;
      const baseY = this.field.top + fieldHeight * path.y;
      if (staticFrame) {
        graphic.position.set(baseX, baseY);
        graphic.scale.set(0.82);
        graphic.alpha = 0.34 * this.themeAlpha * this.intensity;
        continue;
      }

      const travel = elapsedSeconds * path.speed + phase;
      const crossDrift = Math.sin(travel * 0.43 + phase * 1.7) * 3;
      const riseDrift = Math.sin(travel * 0.31 + phase * 0.8) * 2;
      const flicker = 0.5 + Math.sin(travel * 2.8 + phase) * 0.5;
      graphic.position.set(
        baseX + Math.sin(travel) * path.radiusX + crossDrift,
        baseY + Math.cos(travel * 0.73) * path.radiusY + riseDrift,
      );
      graphic.scale.set(0.78 + flicker * 0.26);
      graphic.alpha =
        (0.32 + flicker * 0.58) * this.themeAlpha * this.intensity;
    }
  }

  stopFrame() {
    if (!this.frame) {
      return;
    }
    this.cancelFrame(this.frame);
    this.frame = 0;
  }

  destroy() {
    this.active = false;
    this.stopFrame();
    this.root.destroy({ children: true });
  }
}

function finiteOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  const timer = globalThis.setTimeout(
    () => callback(defaultTimeSource()),
    16,
  );
  timer?.unref?.();
  return timer;
}

function defaultCancelFrame(frame) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frame);
    return;
  }
  globalThis.clearTimeout?.(frame);
}

function defaultTimeSource() {
  return globalThis.performance?.now?.() ?? Date.now();
}

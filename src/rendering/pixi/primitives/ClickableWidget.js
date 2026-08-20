import { Container } from 'pixi.js';

const DEFAULT_PRESS_SCALE = 0.97;
const DEFAULT_RELEASE_PEAK_SCALE = 1.035;
const DEFAULT_RELEASE_DURATION_MS = 180;
const RELEASE_PEAK_PROGRESS = 0.36;

/**
 * Shared retained foundation for whole-widget activation feedback.
 *
 * Subclasses own their visuals and data binding. This class owns the single
 * press target, compact press/release motion, haptic request, activation gate,
 * and page-swipe exclusion used by button-like rows and controls.
 */
export class ClickableWidget {
  constructor({
    action = null,
    enabled = true,
    fallbackHitTest = false,
    haptic = 'light',
    hitTest = null,
    inputRouter = null,
    label = 'clickableWidget',
    motionRuntime = null,
    pressSlop = null,
    pressScale = DEFAULT_PRESS_SCALE,
    releaseDurationMs = DEFAULT_RELEASE_DURATION_MS,
    releasePeakScale = DEFAULT_RELEASE_PEAK_SCALE,
  } = {}) {
    this.root = new Container({ label });
    this.action = typeof action === 'function' ? action : null;
    this.enabled = enabled !== false;
    this.pressed = false;
    this.clickableVisual = this.root;
    this.pressScale = finitePositive(pressScale, DEFAULT_PRESS_SCALE);
    this.releasePeakScale = finitePositive(
      releasePeakScale,
      DEFAULT_RELEASE_PEAK_SCALE,
    );
    this.releaseDurationMs = finitePositive(
      releaseDurationMs,
      DEFAULT_RELEASE_DURATION_MS,
    );
    this.requestFrame = motionRuntime?.requestFrame ?? requestFrame;
    this.cancelFrame = motionRuntime?.cancelFrame ?? cancelFrame;
    this.timeSource = motionRuntime?.now ?? now;
    this.reducedMotion =
      motionRuntime?.prefersReducedMotion ?? prefersReducedMotion;
    this.releaseFrame = null;
    this.releaseStartedAt = null;
    this.registration =
      inputRouter?.registerPressTarget?.(this.root, {
        enabled: () => this.isClickableEnabled(),
        onPressChange: (pressed, context) =>
          this.setPressed(pressed, context),
        onActivate: (payload) => this.activate(payload),
        fallbackHitTest,
        haptic,
        hitTest,
        slop: pressSlop,
        excludePageSwipe: true,
      }) ?? null;
    this.syncClickableInteraction();
  }

  setClickableVisual(displayObject) {
    this.clickableVisual = displayObject ?? this.root;
    this.clickableVisual.scale.set(1);
    return this;
  }

  setClickableState({ action = this.action, enabled = this.enabled } = {}) {
    this.action = typeof action === 'function' ? action : null;
    this.enabled = enabled !== false;
    this.syncClickableInteraction();
    return this;
  }

  isClickableEnabled() {
    return (
      this.enabled &&
      Boolean(this.action) &&
      this.root.visible &&
      this.root.renderable &&
      !this.root.destroyed
    );
  }

  syncClickableInteraction() {
    const interactive = this.isClickableEnabled();
    this.root.eventMode = interactive ? 'static' : 'none';
    this.root.cursor = interactive ? 'pointer' : 'default';
    if (!interactive && this.pressed) {
      this.setPressed(false);
    }
    return this;
  }

  setPressed(pressed, context = null) {
    const nextPressed = Boolean(pressed) && this.isClickableEnabled();
    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.clickableVisual.scale.set(this.pressScale);
      this.onClickablePressStateChanged(true);
      return this;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    this.onClickablePressStateChanged(false);
    if (
      wasPressed &&
      context?.confirmed === true &&
      !this.reducedMotion()
    ) {
      this.startReleaseAnimation();
    } else {
      this.cancelReleaseAnimation();
      this.clickableVisual.scale.set(1);
    }
    return this;
  }

  onClickablePressStateChanged() {}

  activate(payload) {
    if (!this.isClickableEnabled()) {
      return false;
    }
    return this.action?.(payload) ?? true;
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = this.timeSource();
    const tick = () => {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (this.timeSource() - this.releaseStartedAt) /
            this.releaseDurationMs,
        ),
      );
      this.clickableVisual.scale.set(
        sampleReleaseScale(progress, {
          pressScale: this.pressScale,
          releasePeakScale: this.releasePeakScale,
        }),
      );
      if (progress >= 1) {
        this.releaseFrame = null;
        this.releaseStartedAt = null;
        this.clickableVisual.scale.set(1);
        return;
      }
      this.releaseFrame = this.requestFrame(tick);
    };
    this.releaseFrame = this.requestFrame(tick);
  }

  startAttentionEffect() {
    this.cancelReleaseAnimation();
    this.pressed = false;
    this.onClickablePressStateChanged(false);
    if (this.reducedMotion()) {
      this.clickableVisual.scale.set(1);
      return false;
    }
    this.clickableVisual.scale.set(this.pressScale);
    this.startReleaseAnimation();
    return true;
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame !== null) {
      this.cancelFrame(this.releaseFrame);
    }
    this.releaseFrame = null;
    this.releaseStartedAt = null;
  }

  resetClickableState() {
    this.cancelReleaseAnimation();
    this.action = null;
    this.enabled = false;
    this.pressed = false;
    this.clickableVisual.scale.set(1);
    this.syncClickableInteraction();
  }

  destroy(options) {
    this.cancelReleaseAnimation();
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.registration = null;
    this.root.destroy(options);
  }
}

function sampleReleaseScale(
  progress,
  { pressScale, releasePeakScale },
) {
  const safeProgress = Math.min(1, Math.max(0, progress));
  if (safeProgress <= RELEASE_PEAK_PROGRESS) {
    return (
      pressScale +
      (releasePeakScale - pressScale) *
        easeOutCubic(safeProgress / RELEASE_PEAK_PROGRESS)
    );
  }
  return (
    releasePeakScale +
    (1 - releasePeakScale) *
      easeOutCubic(
        (safeProgress - RELEASE_PEAK_PROGRESS) /
          (1 - RELEASE_PEAK_PROGRESS),
      )
  );
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function finitePositive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function prefersReducedMotion() {
  return Boolean(
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout?.(callback, 16) ?? 0;
}

function cancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout?.(frameId);
  }
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

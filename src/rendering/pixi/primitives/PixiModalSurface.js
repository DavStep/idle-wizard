import { Graphics, Rectangle } from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { isDisplayObjectDescendant } from '../input/InputGeometry.js';
import { BasePixiRetainedView } from './BasePixiRetainedView.js';
import {
  PIXI_DIALOG_BASE_GEOMETRY,
  PixiDialogFrame,
} from './PixiDialogFrame.js';

export const PIXI_MODAL_OPEN_MOTION = Object.freeze({
  durationMs: 225,
  overshootProgress: 0.72,
  startScale: 0.982,
  centerOvershootScale: 1.008,
  topOvershootScale: 1.006,
});

const CENTER_MOTION = 'center';
const TOP_MOTION = 'top';
const DIALOG_EASING = Object.freeze([0.39, 0.575, 0.565, 1]);
const OVERLAY_EASING = Object.freeze([0.37, 0, 0.63, 1]);

export class PixiModalSurface extends BasePixiRetainedView {
  constructor({
    assetManager = null,
    title = '',
    contentWidth = PIXI_DIALOG_BASE_GEOMETRY.contentWidth,
    contentHeight = PIXI_DIALOG_BASE_GEOMETRY.minContentHeight,
    backdropAlpha = 0.78,
    opaqueBackdrop = false,
    inputRouter = null,
    semanticRegistry = null,
    modalId = null,
    dismissOnOutside = null,
    onBack = null,
    onEscape = null,
    openMotion = false,
    motionRuntime = null,
    label = 'modal',
  } = {}) {
    super({ label });
    this.backdropAlpha = backdropAlpha;
    this.opaqueBackdrop = opaqueBackdrop;
    this.inputRouter = inputRouter;
    this.modalId = modalId ?? label;
    this.dismissOnOutside = dismissOnOutside;
    this.modalBackHandler = onBack;
    this.modalEscapeHandler = onEscape;
    this.modalHandle = null;
    this.shown = false;
    this.presented = false;
    this.openMotion = normalizeOpenMotion(openMotion);
    this.openMotionFrame = 0;
    this.openMotionStartedAt = 0;
    this.openMotionProgress = 1;
    this.openMotionBaseX = 0;
    this.openMotionBaseY = 0;
    this.requestMotionFrame =
      motionRuntime?.requestFrame ?? requestFrame;
    this.cancelMotionFrame =
      motionRuntime?.cancelFrame ?? cancelFrame;
    this.motionNow = motionRuntime?.now ?? now;
    this.motionReduced =
      motionRuntime?.prefersReducedMotion ?? prefersReducedMotion;
    this.handleOpenMotionFrame = () => this.tickOpenMotion();
    this.backdrop = new Graphics();
    this.backdrop.label = `${label}:backdrop`;
    this.backdrop.eventMode = 'static';
    this.panel = new PixiDialogFrame({
      assetManager,
      inputRouter,
      semanticRegistry,
      closeSemanticId: `${this.modalId}.close`,
      title,
      coreWidth: contentWidth,
      coreHeight: contentHeight,
      label: `${label}:panel`,
    });
    this.panel.setContentBoxSize(
      contentWidth,
      contentHeight,
      PIXI_UI_GEOMETRY.dialogPadding,
    );
    this.panel.pivot.set(this.panel.outerWidth / 2, this.panel.outerHeight / 2);
    this.root.addChild(this.backdrop, this.panel);
    this.captureOpenMotionBasePosition();
    this.restoreOpenMotion();
  }

  show() {
    this.shown = true;
    this.syncVisibility();
    this.syncModal();
  }

  hide() {
    this.shown = false;
    this.releaseModal();
    this.syncVisibility();
  }

  isShown() {
    return this.shown;
  }

  onActivate() {
    this.syncVisibility();
    this.syncModal();
  }

  onDeactivate() {
    this.presented = false;
    this.stopOpenMotion();
    this.releaseModal();
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
  }

  onApplyTheme(theme = DEFAULT_PIXI_THEME_SNAPSHOT) {
    this.panel.applyTheme(theme);
    this.redrawBackdrop(theme);
  }

  onLayout(projection) {
    if (!projection) {
      return;
    }
    const sourceStageWidth = projection.stageLogicalWidth / projection.sourceScale;
    const sourceOffsetX = projection.sourceOffsetX;
    this.backdrop
      .clear()
      .rect(-sourceOffsetX, 0, sourceStageWidth, projection.sourceHeight)
      .fill({
        color: this.opaqueBackdrop ? this.theme.surface : this.theme.backdrop,
        alpha: this.opaqueBackdrop ? 1 : this.backdropAlpha,
      });
    this.root.hitArea = new Rectangle(
      -sourceOffsetX,
      0,
      sourceStageWidth,
      projection.sourceHeight,
    );
    this.panel.position.set(
      PIXI_UI_GEOMETRY.sourceWidth / 2,
      projection.sourceHeight / 2 + (projection.dialogShift ?? 0),
    );
    this.captureOpenMotionBasePosition();
  }

  redrawBackdrop(theme = this.theme ?? DEFAULT_PIXI_THEME_SNAPSHOT) {
    const projection = this.viewportProjection;
    if (!projection) {
      return;
    }
    const sourceStageWidth = projection.stageLogicalWidth / projection.sourceScale;
    this.backdrop
      .clear()
      .rect(
        -projection.sourceOffsetX,
        0,
        sourceStageWidth,
        projection.sourceHeight,
      )
      .fill({
        color: this.opaqueBackdrop ? theme.surface : theme.backdrop,
        alpha: this.opaqueBackdrop ? 1 : this.backdropAlpha,
      });
  }

  syncVisibility() {
    const visible = this.active && this.shown;
    this.root.visible = visible;
    this.root.renderable = visible;
    this.root.eventMode = visible ? 'static' : 'none';
    if (visible && !this.presented) {
      this.presented = true;
      this.startOpenMotion();
    } else if (!visible && this.presented) {
      this.presented = false;
      this.stopOpenMotion();
    }
  }

  getModalContentRoots() {
    return [this.panel];
  }

  isModalContentDisplayObject(displayObject) {
    return this.getModalContentRoots().some(
      (root) =>
        root &&
        isDisplayObjectDescendant(displayObject, root),
    );
  }

  syncModal() {
    if (!this.active || !this.shown || this.modalHandle || !this.inputRouter) {
      return;
    }
    this.modalHandle = this.inputRouter.pushModal({
      id: this.modalId,
      root: this.panel,
      containsDisplayObject: (displayObject) =>
        this.isModalContentDisplayObject(displayObject),
      containsRegistration: (registration) =>
        this.isModalContentDisplayObject(
          registration?.displayObject,
        ),
      onOutsidePress:
        typeof this.dismissOnOutside === 'function'
          ? () => this.dismissOnOutside()
          : null,
      onBack: this.modalBackHandler,
      onEscape: this.modalEscapeHandler,
    });
  }

  releaseModal() {
    this.modalHandle?.unregister?.();
    this.modalHandle = null;
  }

  onDestroy() {
    this.presented = false;
    this.stopOpenMotion();
    this.releaseModal();
  }

  captureOpenMotionBasePosition() {
    this.openMotionBaseX = this.panel?.position?.x ?? 0;
    this.openMotionBaseY = this.panel?.position?.y ?? 0;
    if (this.openMotionFrame) {
      this.applyOpenMotion(this.openMotionProgress);
    }
  }

  startOpenMotion() {
    this.stopOpenMotion();
    if (!this.openMotion || this.motionReduced()) {
      return;
    }
    this.captureOpenMotionBasePosition();
    this.openMotionStartedAt = this.motionNow();
    this.openMotionProgress = 0;
    this.applyOpenMotion(0);
    this.openMotionFrame = this.requestMotionFrame(
      this.handleOpenMotionFrame,
    );
  }

  tickOpenMotion() {
    this.openMotionFrame = 0;
    if (!this.active || !this.shown || !this.presented) {
      this.restoreOpenMotion();
      return;
    }
    const elapsed = Math.max(
      0,
      this.motionNow() - this.openMotionStartedAt,
    );
    const progress = Math.min(
      1,
      elapsed / PIXI_MODAL_OPEN_MOTION.durationMs,
    );
    this.openMotionProgress = progress;
    this.applyOpenMotion(progress);
    if (progress >= 1) {
      this.restoreOpenMotion();
      return;
    }
    this.openMotionFrame = this.requestMotionFrame(
      this.handleOpenMotionFrame,
    );
  }

  applyOpenMotion(progress) {
    if (!this.openMotion) {
      this.restoreOpenMotion();
      return;
    }
    const state = sampleOpenMotion(progress, this.openMotion);
    this.backdrop.alpha = state.backdropAlpha;
    this.panel.alpha = state.panelAlpha;
    this.panel.scale.set(state.panelScale);
    this.panel.position.x = this.openMotionBaseX;
    this.panel.position.y =
      this.openMotionBaseY +
      (this.openMotion === TOP_MOTION
        ? (this.panel.outerHeight * (1 - state.panelScale)) / 2
        : 0);
  }

  stopOpenMotion() {
    if (this.openMotionFrame) {
      this.cancelMotionFrame(this.openMotionFrame);
      this.openMotionFrame = 0;
    }
    this.restoreOpenMotion();
  }

  restoreOpenMotion() {
    this.openMotionProgress = 1;
    if (this.backdrop) {
      this.backdrop.alpha = 1;
    }
    if (this.panel) {
      this.panel.alpha = 1;
      this.panel.scale.set(1);
      this.panel.position.set(
        this.openMotionBaseX,
        this.openMotionBaseY,
      );
    }
  }
}

function normalizeOpenMotion(value) {
  if (value === true || value === CENTER_MOTION) {
    return CENTER_MOTION;
  }
  return value === TOP_MOTION ? TOP_MOTION : false;
}

function sampleOpenMotion(progress, variant) {
  const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
  const split = PIXI_MODAL_OPEN_MOTION.overshootProgress;
  const overshoot =
    variant === TOP_MOTION
      ? PIXI_MODAL_OPEN_MOTION.topOvershootScale
      : PIXI_MODAL_OPEN_MOTION.centerOvershootScale;
  const backdropAlpha = sampleCubicBezier(
    normalized,
    ...OVERLAY_EASING,
  );
  if (normalized <= split) {
    const local = sampleCubicBezier(
      normalized / split,
      ...DIALOG_EASING,
    );
    return {
      backdropAlpha,
      panelAlpha: local,
      panelScale:
        PIXI_MODAL_OPEN_MOTION.startScale +
        (overshoot - PIXI_MODAL_OPEN_MOTION.startScale) * local,
    };
  }
  const local = sampleCubicBezier(
    (normalized - split) / (1 - split),
    ...DIALOG_EASING,
  );
  return {
    backdropAlpha,
    panelAlpha: 1,
    panelScale: overshoot + (1 - overshoot) * local,
  };
}

function sampleCubicBezier(progress, x1, y1, x2, y2) {
  if (progress <= 0 || progress >= 1) {
    return progress;
  }
  let parameter = progress;
  for (let index = 0; index < 6; index += 1) {
    const error =
      sampleBezierCoordinate(parameter, x1, x2) - progress;
    const slope = sampleBezierSlope(parameter, x1, x2);
    if (Math.abs(error) < 1e-7 || Math.abs(slope) < 1e-7) {
      break;
    }
    parameter = Math.min(
      1,
      Math.max(0, parameter - error / slope),
    );
  }
  return sampleBezierCoordinate(parameter, y1, y2);
}

function sampleBezierCoordinate(parameter, control1, control2) {
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * parameter * control1 +
    3 * inverse * parameter * parameter * control2 +
    parameter * parameter * parameter
  );
}

function sampleBezierSlope(parameter, control1, control2) {
  const inverse = 1 - parameter;
  return (
    3 * inverse * inverse * control1 +
    6 * inverse * parameter * (control2 - control1) +
    3 * parameter * parameter * (1 - control2)
  );
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

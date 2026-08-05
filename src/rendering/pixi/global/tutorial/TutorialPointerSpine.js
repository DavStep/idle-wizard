import { Container } from 'pixi.js';

import { TUTORIAL_PIXI_GEOMETRY } from './TutorialPixiGeometry.js';

export const TUTORIAL_POINTER_SPINE_DEFINITION = Object.freeze({
  key: 'tutorial:pointer',
  skeletonSrc: 'spine/tutorial-pointer/pointer.skel',
  atlasSrc: 'spine/tutorial-pointer/pointer.atlas',
  animationName: 'click1',
});

export const TUTORIAL_POINTER_GESTURE_KINDS = Object.freeze({
  HORIZONTAL_DRAG: 'horizontal-drag',
});

export const TUTORIAL_POINTER_DRAG_TIMING = Object.freeze({
  appearMs: 160,
  pressMs: 360,
  holdMs: 180,
  dragMs: 700,
  releaseMs: 360,
  hideMs: 180,
  repeatDelayMs: 2_000,
});

const PLACEMENT_ROTATIONS = Object.freeze({
  'top-left': Object.freeze({ degrees: 135, nudgeX: 6, nudgeY: 6 }),
  'top-right': Object.freeze({ degrees: -135, nudgeX: -6, nudgeY: 6 }),
  'bottom-left': Object.freeze({ degrees: 45, nudgeX: 6, nudgeY: -6 }),
  'bottom-right': Object.freeze({ degrees: -45, nudgeX: -6, nudgeY: -6 }),
});

/**
 * Spine pointer hosted inside the shared Pixi application. It creates no
 * canvas and uses manual updates, so closed/hidden tutorial UI does no ticker
 * work.
 */
export class TutorialPointerSpine {
  constructor({
    spineRuntime = null,
    assetBaseUrl = import.meta.env?.BASE_URL ?? '/',
    definition = TUTORIAL_POINTER_SPINE_DEFINITION,
    onError = null,
  } = {}) {
    this.spineRuntime = spineRuntime;
    this.definition = definition;
    this.assetBaseUrl = assetBaseUrl;
    this.onError = typeof onError === 'function' ? onError : null;
    this.root = new Container();
    this.root.label = 'tutorial:pointer';
    this.root.pivot.set(
      TUTORIAL_PIXI_GEOMETRY.pointerShellWidth / 2,
      TUTORIAL_PIXI_GEOMETRY.pointerShellHeight / 2,
    );
    this.root.visible = false;
    this.root.renderable = false;
    this.root.eventMode = 'none';
    this.spine = null;
    this.readyPromise = null;
    this.destroyed = false;
    this.visible = false;
    this.motionEnabled = true;
    this.error = null;
    this.placement = null;
    this.gesture = null;
    this.gestureKey = '';
    this.gestureElapsedMs = 0;
    this.gestureOffsetX = 0;
  }

  ensureReady() {
    if (!this.spineRuntime || this.destroyed) {
      return Promise.resolve(null);
    }
    if (!this.readyPromise) {
      this.readyPromise = this.createSpine().catch((error) => {
        this.error = error;
        this.onError?.(error);
        throw error;
      });
    }
    return this.readyPromise;
  }

  async createSpine() {
    const skeletonSrc = resolvePublicAssetUrl(
      this.definition.skeletonSrc,
      this.assetBaseUrl,
    );
    const atlasSrc = resolvePublicAssetUrl(
      this.definition.atlasSrc,
      this.assetBaseUrl,
    );
    await this.spineRuntime.loadSkeleton({
      key: this.definition.key,
      skeletonSrc,
      atlasSrc,
    });
    if (this.destroyed) {
      return null;
    }
    const spine = await this.spineRuntime.createSkeleton({
      key: this.definition.key,
      layer: null,
      autoUpdate: false,
      animationName: this.definition.animationName,
      loop: true,
    });
    if (this.destroyed) {
      spine?.destroy?.({ children: true });
      return null;
    }
    this.spine = spine;
    this.fitSpine(spine);
    this.root.addChild(spine);
    if (this.gesture) {
      this.restartGestureAnimation();
    }
    this.syncPlayback();
    return spine;
  }

  setPlacement(placement) {
    if (!placement) {
      this.setVisible(false);
      return;
    }
    this.placement = placement;
    this.applyPlacement();
  }

  applyPlacement() {
    if (!this.placement) {
      return;
    }
    const transform =
      PLACEMENT_ROTATIONS[this.placement.id] ??
      PLACEMENT_ROTATIONS['bottom-right'];
    this.root.position.set(
      this.placement.x + transform.nudgeX + this.gestureOffsetX,
      this.placement.y + transform.nudgeY,
    );
    this.root.rotation = (transform.degrees * Math.PI) / 180;
  }

  setGesture(gesture = null) {
    const nextGesture = normalizeGesture(gesture);
    const nextKey = nextGesture
      ? `${nextGesture.kind}:${nextGesture.travelX}`
      : '';
    if (nextKey === this.gestureKey) {
      return;
    }
    this.gesture = nextGesture;
    this.gestureKey = nextKey;
    if (this.gesture) {
      this.resetGestureCycle();
    } else {
      this.gestureElapsedMs = 0;
      this.gestureOffsetX = 0;
      this.root.alpha = 1;
      this.applyPlacement();
      this.restartDefaultAnimation();
    }
    this.syncPlayback();
  }

  setVisible(visible) {
    const nextVisible = Boolean(visible);
    if (nextVisible && !this.visible && this.gesture) {
      this.resetGestureCycle();
    }
    this.visible = nextVisible;
    if (this.visible) {
      void this.ensureReady().catch(() => {});
    }
    this.syncPlayback();
  }

  setMotionEnabled(enabled) {
    this.motionEnabled = Boolean(enabled);
    this.syncPlayback();
  }

  update(deltaMs) {
    if (!this.visible || !this.motionEnabled || !this.spine) {
      return false;
    }
    if (this.gesture?.kind === TUTORIAL_POINTER_GESTURE_KINDS.HORIZONTAL_DRAG) {
      this.updateHorizontalDrag(deltaMs);
      return true;
    }
    this.spine.update?.(Math.max(0, Number(deltaMs) || 0) / 1000);
    return true;
  }

  whenReady() {
    return this.ensureReady();
  }

  syncPlayback() {
    const shouldShowStatic =
      this.visible && (!this.gesture || !this.motionEnabled);
    if (!this.gesture || !this.motionEnabled || !this.visible) {
      this.root.visible = shouldShowStatic;
      this.root.renderable = shouldShowStatic;
      this.root.alpha = 1;
      this.gestureOffsetX = 0;
      this.applyPlacement();
    }
    if (this.spine?.state) {
      this.spine.state.timeScale =
        this.visible && this.motionEnabled ? 1 : 0;
    }
  }

  updateHorizontalDrag(deltaMs) {
    const cycleMs = getDragCycleMs();
    const previousElapsed = this.gestureElapsedMs;
    this.gestureElapsedMs =
      (this.gestureElapsedMs + Math.max(0, Number(deltaMs) || 0)) %
      cycleMs;
    if (this.gestureElapsedMs < previousElapsed) {
      this.restartGestureAnimation();
    }

    const frame = resolveHorizontalDragFrame(
      this.gestureElapsedMs,
      this.gesture.travelX,
    );
    this.gestureOffsetX = frame.offsetX;
    this.root.alpha = frame.alpha;
    this.root.visible = frame.visible;
    this.root.renderable = frame.visible;
    this.applyPlacement();

    if (this.spine?.state) {
      this.spine.state.timeScale = frame.playbackRate;
    }
    if (frame.playbackRate > 0) {
      this.spine.update?.(
        (Math.max(0, Number(deltaMs) || 0) / 1000) *
          frame.playbackRate,
      );
    }
  }

  resetGestureCycle() {
    this.gestureElapsedMs = 0;
    this.gestureOffsetX = 0;
    this.root.alpha = 1;
    this.applyPlacement();
    this.restartGestureAnimation();
  }

  restartGestureAnimation() {
    if (
      this.spine?.state &&
      typeof this.spine.state.setAnimation === 'function'
    ) {
      this.spine.state.setAnimation(
        0,
        this.definition.animationName,
        false,
      );
    }
  }

  restartDefaultAnimation() {
    if (
      this.spine?.state &&
      typeof this.spine.state.setAnimation === 'function'
    ) {
      this.spine.state.setAnimation(
        0,
        this.definition.animationName,
        true,
      );
    }
  }

  fitSpine(spine) {
    spine.update?.(0);
    const bounds = readBounds(spine);
    if (!bounds.width || !bounds.height) {
      spine.position?.set?.(
        TUTORIAL_PIXI_GEOMETRY.pointerShellWidth / 2,
        TUTORIAL_PIXI_GEOMETRY.pointerShellHeight / 2,
      );
      return;
    }
    const availableWidth =
      TUTORIAL_PIXI_GEOMETRY.pointerVisualWidth -
      TUTORIAL_PIXI_GEOMETRY.pointerPadding * 2;
    const availableHeight =
      TUTORIAL_PIXI_GEOMETRY.pointerVisualHeight -
      TUTORIAL_PIXI_GEOMETRY.pointerPadding * 2;
    const scale = Math.min(
      availableWidth / bounds.width,
      availableHeight / bounds.height,
    );
    spine.scale?.set?.(scale);
    spine.position?.set?.(
      (TUTORIAL_PIXI_GEOMETRY.pointerShellWidth -
        bounds.width * scale) /
        2 -
        bounds.x * scale,
      (TUTORIAL_PIXI_GEOMETRY.pointerShellHeight -
        bounds.height * scale) /
        2 -
        bounds.y * scale,
    );
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.spine?.destroy?.({ children: true });
    this.spine = null;
    this.root.destroy({ children: true });
  }
}

function normalizeGesture(gesture) {
  if (
    gesture?.kind !== TUTORIAL_POINTER_GESTURE_KINDS.HORIZONTAL_DRAG
  ) {
    return null;
  }
  const travelX = Number(gesture.travelX) || 0;
  return Math.abs(travelX) > 0
    ? Object.freeze({
        kind: TUTORIAL_POINTER_GESTURE_KINDS.HORIZONTAL_DRAG,
        travelX,
      })
    : null;
}

function getDragCycleMs() {
  return Object.values(TUTORIAL_POINTER_DRAG_TIMING).reduce(
    (total, duration) => total + duration,
    0,
  );
}

function resolveHorizontalDragFrame(elapsedMs, travelX) {
  const timing = TUTORIAL_POINTER_DRAG_TIMING;
  let cursor = Math.max(0, Number(elapsedMs) || 0);

  if (cursor < timing.appearMs) {
    return {
      offsetX: 0,
      alpha: easeOutQuart(cursor / timing.appearMs),
      visible: true,
      playbackRate: 0,
    };
  }
  cursor -= timing.appearMs;

  if (cursor < timing.pressMs) {
    return {
      offsetX: 0,
      alpha: 1,
      visible: true,
      playbackRate: 1,
    };
  }
  cursor -= timing.pressMs;

  if (cursor < timing.holdMs) {
    return {
      offsetX: 0,
      alpha: 1,
      visible: true,
      playbackRate: 0,
    };
  }
  cursor -= timing.holdMs;

  if (cursor < timing.dragMs) {
    return {
      offsetX: travelX * smoothStep(cursor / timing.dragMs),
      alpha: 1,
      visible: true,
      playbackRate: 0,
    };
  }
  cursor -= timing.dragMs;

  if (cursor < timing.releaseMs) {
    return {
      offsetX: travelX,
      alpha: 1,
      visible: true,
      playbackRate: 1,
    };
  }
  cursor -= timing.releaseMs;

  if (cursor < timing.hideMs) {
    return {
      offsetX: travelX,
      alpha: 1 - easeOutQuart(cursor / timing.hideMs),
      visible: true,
      playbackRate: 0,
    };
  }

  return {
    offsetX: 0,
    alpha: 0,
    visible: false,
    playbackRate: 0,
  };
}

function easeOutQuart(value) {
  const progress = clamp01(value);
  return 1 - (1 - progress) ** 4;
}

function smoothStep(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function resolvePublicAssetUrl(path, baseUrl) {
  const normalizedBase = String(baseUrl || '/').replace(/\/?$/, '/');
  return `${normalizedBase}${String(path).replace(/^\/+/, '')}`;
}

function readBounds(displayObject) {
  const bounds = displayObject.getBounds?.() ?? displayObject.bounds ?? {};
  const minX = Number(bounds.minX);
  const minY = Number(bounds.minY);
  const maxX = Number(bounds.maxX);
  const maxY = Number(bounds.maxY);
  const x = Number.isFinite(Number(bounds.x)) ? Number(bounds.x) : minX;
  const y = Number.isFinite(Number(bounds.y)) ? Number(bounds.y) : minY;
  const width = Number.isFinite(Number(bounds.width))
    ? Number(bounds.width)
    : maxX - minX;
  const height = Number.isFinite(Number(bounds.height))
    ? Number(bounds.height)
    : maxY - minY;
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

const POINTER_SPINE_KEY = 'tutorial:pointer';
const POINTER_SPINE_SKELETON_PATH = 'spine/tutorial-pointer/pointer.skel';
const POINTER_SPINE_ATLAS_PATH = 'spine/tutorial-pointer/pointer.atlas';
const POINTER_SPINE_ANIMATION = 'click1';
const POINTER_SPINE_WIDTH = 76;
const POINTER_SPINE_HEIGHT = 90;
const POINTER_SPINE_VISUAL_WIDTH = 44;
const POINTER_SPINE_VISUAL_HEIGHT = 64;
const POINTER_SPINE_PADDING = 2;
const LOGICAL_VIEWPORT_WIDTH = 390;
const LOGICAL_VIEWPORT_HEIGHT = 844;
const POINTER_POSES = Object.freeze({
  'top-left': Object.freeze({ nudgeX: 6, nudgeY: 6, rotationDegrees: 135 }),
  'top-right': Object.freeze({ nudgeX: -6, nudgeY: 6, rotationDegrees: -135 }),
  'bottom-left': Object.freeze({ nudgeX: 6, nudgeY: -6, rotationDegrees: 45 }),
  'bottom-right': Object.freeze({ nudgeX: -6, nudgeY: -6, rotationDegrees: -45 }),
});
const DEFAULT_POINTER_POSE = Object.freeze({
  nudgeX: 0,
  nudgeY: 0,
  rotationDegrees: 0,
});

export class TutorialPointerSpineManager {
  constructor({
    spineRuntimeFacade = null,
    width = POINTER_SPINE_WIDTH,
    height = POINTER_SPINE_HEIGHT,
    animationName = POINTER_SPINE_ANIMATION,
    assetBaseUrl = import.meta.env?.BASE_URL ?? '/',
    enabled = null,
  } = {}) {
    this.spineRuntimeFacade = spineRuntimeFacade;
    this.width = width;
    this.height = height;
    this.animationName = animationName;
    this.skeletonSrc = resolvePublicAssetUrl(
      POINTER_SPINE_SKELETON_PATH,
      assetBaseUrl,
    );
    this.atlasSrc = resolvePublicAssetUrl(POINTER_SPINE_ATLAS_PATH, assetBaseUrl);
    this.enabled = enabled;
    this.pointer = null;
    this.shell = null;
    this.spine = null;
    this.readyPromise = null;
    this.destroyed = false;
    this.visible = false;
    this.motionEnabled = true;
    this.failed = false;
    this.placement = null;
    this.baseFit = null;
  }

  mount(pointer) {
    this.pointer = pointer;
    this.destroyed = false;

    if (!this.shell) {
      this.createShell(pointer.ownerDocument);
    }

    if (this.shell && this.shell.parentElement !== pointer) {
      pointer.prepend(this.shell);
    }

    if (this.canUseRuntime()) {
      void this.ensureReady();
    }
  }

  unmount() {
    this.destroyed = true;
    this.clearReadyState();
    this.destroySpine();
    this.shell?.remove();
    this.pointer = null;
    this.shell = null;
    this.readyPromise = null;
    this.visible = false;
    this.placement = null;
    this.baseFit = null;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.applyPlaybackState();
  }

  setMotionEnabled(enabled) {
    this.motionEnabled = Boolean(enabled);
    this.applyPlaybackState();
  }

  setPlacement({ x, y, placement } = {}) {
    const normalizedX = Number(x);
    const normalizedY = Number(y);

    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
      return;
    }

    this.placement = {
      x: normalizedX,
      y: normalizedY,
      placement: String(placement ?? ''),
    };
    this.applyPlacement();
  }

  whenReady() {
    return this.readyPromise ?? Promise.resolve(this.spine);
  }

  canUseRuntime() {
    if (this.enabled === false) {
      return false;
    }

    return Boolean(
      this.spineRuntimeFacade &&
        typeof this.spineRuntimeFacade.loadSkeleton === 'function' &&
        typeof this.spineRuntimeFacade.createSkeleton === 'function',
    );
  }

  createShell(doc) {
    if (!doc) {
      return;
    }

    this.shell = doc.createElement('span');
    this.shell.className = 'tutorial-layer__pointer-spine-shell';
    this.shell.hidden = true;
    this.shell.setAttribute('aria-hidden', 'true');
  }

  async ensureReady() {
    if (this.failed || this.spine) {
      return this.spine;
    }

    if (!this.readyPromise) {
      this.readyPromise = this.initSpine().catch(() => {
        this.failed = true;
        this.clearReadyState();
        return null;
      });
    }

    return this.readyPromise;
  }

  async initSpine() {
    if (!this.canUseRuntime() || this.destroyed) {
      return null;
    }

    await this.spineRuntimeFacade.loadSkeleton({
      key: POINTER_SPINE_KEY,
      skeletonSrc: this.skeletonSrc,
      atlasSrc: this.atlasSrc,
    });

    if (this.destroyed) {
      return null;
    }

    const spine = await this.spineRuntimeFacade.createSkeleton({
      key: POINTER_SPINE_KEY,
      layer: 'overlay',
      autoUpdate: true,
    });

    if (this.destroyed) {
      spine?.destroy?.({ children: true });
      return null;
    }

    this.spine = spine;
    this.spineRuntimeFacade.attachToElement?.(this.pointer, spine, {
      zIndex: 0,
    });
    this.fitSpine(spine);
    this.playAnimation(spine);
    this.markReady();
    this.applyPlacement();
    this.applyPlaybackState();

    return spine;
  }

  fitSpine(spine) {
    spine.update?.(0);
    const bounds = readBounds(spine);

    if (!bounds.width || !bounds.height) {
      this.baseFit = {
        scale: 1,
        x: this.width / 2,
        y: this.height / 2,
      };
      return;
    }

    const availableWidth = Math.max(
      1,
      POINTER_SPINE_VISUAL_WIDTH - POINTER_SPINE_PADDING * 2,
    );
    const availableHeight = Math.max(
      1,
      POINTER_SPINE_VISUAL_HEIGHT - POINTER_SPINE_PADDING * 2,
    );
    const scale = Math.min(
      availableWidth / bounds.width,
      availableHeight / bounds.height,
    );

    this.baseFit = {
      scale,
      x: (this.width - bounds.width * scale) / 2 - bounds.x * scale,
      y: (this.height - bounds.height * scale) / 2 - bounds.y * scale,
    };
  }

  applyPlacement() {
    if (!this.spine || !this.baseFit || !this.placement) {
      return;
    }

    const transform = resolvePointerTransform({
      placement: this.placement,
      pose: resolvePointerPose(this.placement.placement),
      baseFit: this.baseFit,
      shellWidth: this.width,
      shellHeight: this.height,
      uiScale: this.getUiScale(),
      canvasRect: this.getCanvasRect(),
      rootRect: this.getRootRect(),
    });

    this.spine.scale?.set?.(transform.scale);
    this.spine.position?.set?.(transform.x, transform.y);
    this.spine.rotation = transform.rotation;
  }

  getUiScale() {
    const elements = [
      this.pointer,
      this.pointer?.closest?.('.tutorial-layer'),
      this.pointer?.closest?.('.game-stage'),
    ];
    const view = this.pointer?.ownerDocument?.defaultView ?? globalThis.window;

    for (const element of elements) {
      if (!element) {
        continue;
      }

      const inlineValue = element?.style?.getPropertyValue?.('--style-ui-scale');
      const computedValue = view
        ?.getComputedStyle?.(element)
        ?.getPropertyValue?.('--style-ui-scale');
      const scale = Number.parseFloat(inlineValue || computedValue);

      if (Number.isFinite(scale) && scale > 0) {
        return scale;
      }
    }

    return 1;
  }

  getCanvasRect() {
    const canvas = this.pointer
      ?.closest?.('.game-stage')
      ?.querySelector?.('.game-canvas');
    const rect = canvas?.getBoundingClientRect?.();

    return hasArea(rect) ? rect : null;
  }

  getRootRect() {
    const rect = this.pointer
      ?.closest?.('.tutorial-layer')
      ?.getBoundingClientRect?.();

    return rect && Number.isFinite(rect.left) && Number.isFinite(rect.top)
      ? rect
      : null;
  }

  playAnimation(spine) {
    const animationName =
      findAnimationName(spine, this.animationName) ?? findAnimationName(spine);

    if (animationName && typeof spine.state?.setAnimation === 'function') {
      spine.state.setAnimation(0, animationName, true);
    }
  }

  markReady() {
    if (this.pointer) {
      this.pointer.dataset.spineReady = 'true';
    }

    if (this.shell) {
      this.shell.hidden = false;
    }
  }

  clearReadyState() {
    if (this.pointer) {
      delete this.pointer.dataset.spineReady;
    }

    if (this.shell) {
      this.shell.hidden = true;
    }
  }

  applyPlaybackState() {
    const playing = Boolean(this.visible && this.motionEnabled && this.spine);

    if (this.spine?.state) {
      this.spine.state.timeScale = playing ? 1 : 0;
    }

    if (this.spine) {
      this.spine.visible = this.visible;
    }
  }

  destroySpine() {
    this.spineRuntimeFacade?.detachFromElement?.(this.pointer, this.spine);
    this.spine?.removeFromParent?.();
    this.spine?.destroy?.({ children: true });
    this.spine = null;
  }
}

function hasArea(rect) {
  return Boolean(rect?.width > 0 && rect?.height > 0);
}

function readBounds(spine) {
  const bounds = spine.getBounds?.() ?? spine.bounds ?? {};
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

function findAnimationName(spine, preferredName = null) {
  const animations = spine.skeleton?.data?.animations ?? [];

  if (preferredName && animations.some((animation) => animation?.name === preferredName)) {
    return preferredName;
  }

  return animations.find((animation) => animation?.name)?.name ?? null;
}

export function resolvePointerPose(placement) {
  return POINTER_POSES[placement] ?? DEFAULT_POINTER_POSE;
}

export function resolvePointerTransform({
  placement,
  pose,
  baseFit,
  shellWidth,
  shellHeight,
  uiScale,
  canvasRect = null,
  rootRect = null,
}) {
  const logicalScaleX = canvasRect?.width > 0
    ? LOGICAL_VIEWPORT_WIDTH / canvasRect.width
    : 1;
  const logicalScaleY = canvasRect?.height > 0
    ? LOGICAL_VIEWPORT_HEIGHT / canvasRect.height
    : logicalScaleX;
  const rootLeft = rootRect?.left ?? canvasRect?.left ?? 0;
  const rootTop = rootRect?.top ?? canvasRect?.top ?? 0;
  const canvasLeft = canvasRect?.left ?? 0;
  const canvasTop = canvasRect?.top ?? 0;
  const visualScaleX = uiScale * logicalScaleX;
  const visualScaleY = uiScale * logicalScaleY;
  const rotation = (pose.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localX = (baseFit.x - shellWidth / 2) * visualScaleX;
  const localY = (baseFit.y - shellHeight / 2) * visualScaleY;
  const centerX =
    (rootLeft - canvasLeft) * logicalScaleX +
    (placement.x + pose.nudgeX) * visualScaleX;
  const centerY =
    (rootTop - canvasTop) * logicalScaleY +
    (placement.y + pose.nudgeY) * visualScaleY;

  return {
    x: centerX + localX * cos - localY * sin,
    y: centerY + localX * sin + localY * cos,
    scale: baseFit.scale * Math.min(visualScaleX, visualScaleY),
    rotation,
  };
}

export function resolvePublicAssetUrl(assetPath, baseUrl = '/') {
  const normalizedBaseUrl = String(baseUrl || '/');
  const normalizedAssetPath = String(assetPath ?? '').replace(/^\/+/, '');
  const separator = normalizedBaseUrl.endsWith('/') ? '' : '/';

  return `${normalizedBaseUrl}${separator}${normalizedAssetPath}`;
}

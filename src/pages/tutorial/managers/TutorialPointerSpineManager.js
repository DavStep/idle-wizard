import { SpineAssetManager } from '../../../rendering/spine/managers/SpineAssetManager.js';

const POINTER_SPINE_KEY = 'tutorial:pointer';
const POINTER_SPINE_SKELETON_SRC = '/tutorial/pointer/pointer.skel';
const POINTER_SPINE_ATLAS_SRC = '/tutorial/pointer/pointer.atlas';
const POINTER_SPINE_ANIMATION = 'click1';
const POINTER_SPINE_WIDTH = 76;
const POINTER_SPINE_HEIGHT = 90;
const POINTER_SPINE_VISUAL_WIDTH = 44;
const POINTER_SPINE_VISUAL_HEIGHT = 64;
const POINTER_SPINE_PADDING = 2;
const POINTER_SPINE_MAX_RESOLUTION = 8;

function defaultPixiImporter() {
  return import('pixi.js');
}

export class TutorialPointerSpineManager {
  constructor({
    assetManager = new SpineAssetManager(),
    importPixi = defaultPixiImporter,
    width = POINTER_SPINE_WIDTH,
    height = POINTER_SPINE_HEIGHT,
    animationName = POINTER_SPINE_ANIMATION,
    enabled = false,
  } = {}) {
    this.assetManager = assetManager;
    this.importPixi = importPixi;
    this.width = width;
    this.height = height;
    this.animationName = animationName;
    this.enabled = enabled;
    this.pointer = null;
    this.shell = null;
    this.canvas = null;
    this.app = null;
    this.spine = null;
    this.readyPromise = null;
    this.destroyed = false;
    this.visible = false;
    this.motionEnabled = true;
    this.failed = false;
  }

  mount(pointer) {
    this.pointer = pointer;
    this.destroyed = false;

    if (!this.shell) {
      this.createCanvas(pointer.ownerDocument);
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
    this.destroyApp();
    this.shell?.remove();
    this.pointer = null;
    this.shell = null;
    this.canvas = null;
    this.readyPromise = null;
    this.visible = false;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.applyPlaybackState();
  }

  setMotionEnabled(enabled) {
    this.motionEnabled = Boolean(enabled);
    this.applyPlaybackState();
  }

  whenReady() {
    return this.readyPromise ?? Promise.resolve(this.spine);
  }

  canUseRuntime() {
    if (this.enabled !== null) {
      return Boolean(this.enabled);
    }

    const view = this.pointer?.ownerDocument?.defaultView ?? globalThis.window;

    return Boolean(
      typeof view?.WebGLRenderingContext === 'function' ||
        typeof view?.WebGL2RenderingContext === 'function' ||
        view?.navigator?.gpu,
    );
  }

  createCanvas(doc) {
    if (!doc) {
      return;
    }

    this.shell = doc.createElement('span');
    this.shell.className = 'tutorial-layer__pointer-spine-shell';
    this.shell.hidden = true;
    this.shell.setAttribute('aria-hidden', 'true');

    this.canvas = doc.createElement('canvas');
    this.canvas.className = 'tutorial-layer__pointer-spine';
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.syncCanvasCssSize();

    this.shell.append(this.canvas);
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
    if (!this.canvas || this.destroyed) {
      return null;
    }

    const { Application } = await this.importPixi();
    await this.assetManager.loadSkeleton({
      key: POINTER_SPINE_KEY,
      skeletonSrc: POINTER_SPINE_SKELETON_SRC,
      atlasSrc: POINTER_SPINE_ATLAS_SRC,
    });

    if (!this.canvas || this.destroyed) {
      return null;
    }

    const app = new Application();
    await app.init({
      canvas: this.canvas,
      width: this.width,
      height: this.height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: this.getCanvasResolution(),
      preference: 'webgl',
      powerPreference: 'low-power',
    });
    this.syncCanvasCssSize();

    if (!this.canvas || this.destroyed) {
      app.destroy({ removeView: false }, { children: true });
      return null;
    }

    const spine = await this.assetManager.createSkeleton({
      key: POINTER_SPINE_KEY,
      autoUpdate: true,
      ticker: app.ticker,
    });

    if (this.destroyed) {
      app.destroy({ removeView: false }, { children: true });
      return null;
    }

    this.app = app;
    this.spine = spine;
    this.fitSpine(spine);
    app.stage.addChild(spine);
    this.playAnimation(spine);
    this.markReady();
    this.applyPlaybackState();

    return spine;
  }

  syncCanvasCssSize() {
    if (!this.canvas) {
      return;
    }

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  getCanvasResolution() {
    const view = this.pointer?.ownerDocument?.defaultView ?? globalThis.window;
    const devicePixelRatio = Number(view?.devicePixelRatio || globalThis.devicePixelRatio || 1);
    const uiScale = Number.parseFloat(
      view?.getComputedStyle?.(this.pointer)?.getPropertyValue('--style-ui-scale'),
    );
    const effectiveScale = Number.isFinite(uiScale) && uiScale > 0 ? uiScale : 1;
    const resolution = devicePixelRatio * effectiveScale;

    return clampResolution(resolution);
  }

  fitSpine(spine) {
    spine.update?.(0);
    const bounds = readBounds(spine);

    if (!bounds.width || !bounds.height) {
      spine.position?.set?.(this.width / 2, this.height / 2);
      return;
    }

    const availableWidth = Math.max(1, POINTER_SPINE_VISUAL_WIDTH - POINTER_SPINE_PADDING * 2);
    const availableHeight = Math.max(1, POINTER_SPINE_VISUAL_HEIGHT - POINTER_SPINE_PADDING * 2);
    const scale = Math.min(
      availableWidth / bounds.width,
      availableHeight / bounds.height,
    );

    spine.scale?.set?.(scale);
    spine.position?.set?.(
      (this.width - bounds.width * scale) / 2 - bounds.x * scale,
      (this.height - bounds.height * scale) / 2 - bounds.y * scale,
    );
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

    if (playing) {
      this.app?.ticker?.start?.();
    } else {
      this.app?.ticker?.stop?.();
    }
  }

  destroyApp() {
    this.app?.destroy({ removeView: false }, { children: true });
    this.app = null;
    this.spine = null;
  }
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

function clampResolution(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, value), POINTER_SPINE_MAX_RESOLUTION);
}

import { Container } from 'pixi.js';

import { TUTORIAL_PIXI_GEOMETRY } from './TutorialPixiGeometry.js';

export const TUTORIAL_POINTER_SPINE_DEFINITION = Object.freeze({
  key: 'tutorial:pointer',
  skeletonSrc: 'spine/tutorial-pointer/pointer.skel',
  atlasSrc: 'spine/tutorial-pointer/pointer.atlas',
  animationName: 'click1',
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
    this.syncPlayback();
    return spine;
  }

  setPlacement(placement) {
    if (!placement) {
      this.setVisible(false);
      return;
    }
    const transform =
      PLACEMENT_ROTATIONS[placement.id] ??
      PLACEMENT_ROTATIONS['bottom-right'];
    this.root.position.set(
      placement.x + transform.nudgeX,
      placement.y + transform.nudgeY,
    );
    this.root.rotation = (transform.degrees * Math.PI) / 180;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.root.visible = this.visible;
    this.root.renderable = this.visible;
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
    this.spine.update?.(Math.max(0, Number(deltaMs) || 0) / 1000);
    return true;
  }

  whenReady() {
    return this.ensureReady();
  }

  syncPlayback() {
    if (this.spine?.state) {
      this.spine.state.timeScale =
        this.visible && this.motionEnabled ? 1 : 0;
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

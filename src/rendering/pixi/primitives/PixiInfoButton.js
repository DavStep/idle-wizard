import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';

const RELEASE_DURATION_MS = 180;

/**
 * Retained image-only information control shared by room and dialog views.
 *
 * Its texture and handlers are installed once. Binding only changes the
 * renderer-neutral enabled/action state.
 */
export class PixiInfoButton extends Container {
  constructor({
    assetManager = null,
    inputRouter = null,
    action = null,
    size = 18,
    label = 'info-button',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.inputRouter = inputRouter;
    this.action = typeof action === 'function' ? action : null;
    this.enabled = true;
    this.pressed = false;
    this.buttonSize = Math.max(0, Number(size) || 0);
    this.releaseFrame = 0;
    this.releaseStartedAt = 0;
    this.visual = new Container({ label: `${label}:visual` });
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${label}:icon`;
    this.icon.anchor.set(0.5);
    this.visual.addChild(this.icon);
    this.addChild(this.visual);

    this.handleTap = (payload) => this.activate(payload);
    this.handlePressChange = (pressed, context) =>
      this.setPressed(pressed, context);
    this.registration =
      this.inputRouter?.registerPressTarget?.(this, {
        enabled: () =>
          this.enabled && this.visible && this.renderable && !this.destroyed,
        excludePageSwipe: true,
        onActivate: this.handleTap,
        onPressChange: this.handlePressChange,
      }) ?? null;
    this.usesDirectInput = !this.registration;

    if (this.usesDirectInput) {
      this.on('pointertap', this.handleTap);
      this.on('pointerdown', () => this.setPressed(true));
      this.on('pointerup', () =>
        this.setPressed(false, { confirmed: true }),
      );
      this.on('pointerupoutside', () => this.setPressed(false));
      this.on('pointercancel', () => this.setPressed(false));
    }

    this.resolveTexture();
    this.setSize(this.buttonSize);
    this.syncInteraction();
  }

  setModel({ enabled = true, action } = {}) {
    this.setEnabled(enabled);
    this.setAction(action);
  }

  setAction(action) {
    this.action = typeof action === 'function' ? action : null;
    return this;
  }

  setEnabled(enabled) {
    this.enabled = enabled !== false;
    if (!this.enabled) {
      this.setPressed(false);
    }
    this.syncInteraction();
    return this;
  }

  setBounds(x, y, width = this.buttonSize, height = width) {
    this.position.set(x, y);
    this.setSize(Math.min(width, height));
    return this;
  }

  setSize(size) {
    this.buttonSize = Math.max(0, Number(size) || 0);
    const textureWidth = Math.max(
      1,
      Number(this.icon.texture?.orig?.width ?? this.icon.texture?.width) || 1,
    );
    const textureHeight = Math.max(
      1,
      Number(this.icon.texture?.orig?.height ?? this.icon.texture?.height) || 1,
    );
    this.icon.height = this.buttonSize;
    this.icon.width = this.buttonSize * (textureWidth / textureHeight);
    this.icon.position.set(this.buttonSize / 2, this.buttonSize / 2);
    this.visual.pivot.set(this.buttonSize / 2, this.buttonSize / 2);
    this.visual.position.set(this.buttonSize / 2, this.buttonSize / 2);
    this.hitArea = new Rectangle(0, 0, this.buttonSize, this.buttonSize);
    return this;
  }

  setPressed(pressed, context = null) {
    const nextPressed = Boolean(pressed) && this.enabled;
    if (nextPressed) {
      this.cancelReleaseAnimation();
      this.pressed = true;
      this.visual.scale.set(0.94);
      return this;
    }

    const wasPressed = this.pressed;
    this.pressed = false;
    if (wasPressed && context?.confirmed === true && !prefersReducedMotion()) {
      this.startReleaseAnimation();
    } else {
      this.cancelReleaseAnimation();
      this.visual.scale.set(1);
    }
    return this;
  }

  activate(payload) {
    if (!this.enabled || !this.visible || !this.renderable) {
      return false;
    }

    return this.action?.(payload) ?? true;
  }

  syncInteraction() {
    this.eventMode = this.enabled && this.visible ? 'static' : 'none';
    this.cursor = this.enabled ? 'pointer' : 'default';
    this.alpha = this.enabled ? 1 : 0.55;
  }

  resolveTexture() {
    if (!this.assetManager?.getTexture) {
      return;
    }

    this.icon.texture =
      this.assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.info) ?? Texture.EMPTY;
  }

  startReleaseAnimation() {
    this.cancelReleaseAnimation();
    this.releaseStartedAt = now();
    const tick = () => {
      const elapsed = now() - this.releaseStartedAt;
      const progress = Math.min(1, Math.max(0, elapsed / RELEASE_DURATION_MS));
      this.visual.scale.set(releaseScale(progress));
      if (progress >= 1) {
        this.releaseFrame = 0;
        this.visual.scale.set(1);
        return;
      }
      this.releaseFrame = requestFrame(tick);
    };
    this.releaseFrame = requestFrame(tick);
  }

  cancelReleaseAnimation() {
    if (this.releaseFrame) {
      cancelFrame(this.releaseFrame);
      this.releaseFrame = 0;
    }
  }

  destroy(options) {
    this.cancelReleaseAnimation();
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.registration = null;
    super.destroy(options);
  }
}

function releaseScale(progress) {
  if (progress <= 0.36) {
    return 0.94 + (1.055 - 0.94) * easeOutCubic(progress / 0.36);
  }
  return 1.055 + (1 - 1.055) * easeOutCubic((progress - 0.36) / 0.64);
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
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

import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';

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
    this.buttonSize = Math.max(0, Number(size) || 0);
    this.icon = new Sprite(Texture.EMPTY);
    this.icon.label = `${label}:icon`;
    this.icon.anchor.set(0.5);
    this.addChild(this.icon);

    this.handleTap = (payload) => this.activate(payload);
    this.handlePressChange = (pressed) => this.setPressed(pressed);
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
      this.on('pointerup', () => this.setPressed(false));
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
    this.hitArea = new Rectangle(0, 0, this.buttonSize, this.buttonSize);
    return this;
  }

  setPressed(pressed) {
    const active = Boolean(pressed) && this.enabled;
    this.icon.scale.set(active ? 0.94 : 1);
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

  destroy(options) {
    if (typeof this.registration === 'function') {
      this.registration();
    } else {
      this.registration?.unregister?.();
    }
    this.registration = null;
    super.destroy(options);
  }
}

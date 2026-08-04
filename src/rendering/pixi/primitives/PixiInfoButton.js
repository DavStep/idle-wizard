import { Sprite, Texture } from 'pixi.js';

import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';

/**
 * Image-only information control composed on the shared button press, input,
 * sound, haptic, disabled, and release-animation contract.
 */
export class PixiInfoButton extends PixiButton {
  constructor({
    assetManager = null,
    inputRouter = null,
    action = null,
    size = 18,
    label = 'info-button',
  } = {}) {
    super({
      action,
      assetManager,
      fallbackHitTest: true,
      height: size,
      inputRouter,
      label,
      text: '',
      variant: 'inline',
      width: size,
    });
    this.buttonSize = Math.max(0, Number(size) || 0);
    this.icon = new Sprite({
      texture: Texture.EMPTY,
      label: `${label}:icon`,
      roundPixels: true,
    });
    this.icon.anchor.set(0.5);
    this.visual.addChild(this.icon);
    this.textLabel.visible = false;
    this.textLabel.renderable = false;
    this.handleDirectTap = (payload) => this.activate(payload);
    this.handleDirectDown = () => this.setPressed(true);
    this.handleDirectUp = () => this.setPressed(false, { confirmed: true });
    this.handleDirectCancel = () => this.setPressed(false);
    this.usesDirectInput = !this.registration;
    if (this.usesDirectInput) {
      this.on('pointertap', this.handleDirectTap);
      this.on('pointerdown', this.handleDirectDown);
      this.on('pointerup', this.handleDirectUp);
      this.on('pointerupoutside', this.handleDirectCancel);
      this.on('pointercancel', this.handleDirectCancel);
    }
    this.resolveTexture();
    this.setSize(this.buttonSize);
    this.syncInteraction();
  }

  setModel({ enabled = true, action } = {}) {
    this.setEnabled(enabled);
    this.setAction(action);
  }

  setBounds(x, y, width = this.buttonSize, height = width) {
    this.position.set(x, y);
    this.setSize(Math.min(width, height));
    return this;
  }

  setSize(size) {
    this.buttonSize = Math.max(0, Number(size) || 0);
    super.setSize(this.buttonSize, this.buttonSize);

    if (!this.icon) {
      return this;
    }

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
    return this;
  }

  syncInteraction() {
    super.syncInteraction();
    this.alpha = this.enabled ? 1 : 0.55;
  }

  resolveTexture() {
    if (this.assetManager?.getTexture) {
      this.icon.texture =
        this.assetManager.getTexture(PIXI_ROOT_RUN_ASSETS.info) ?? Texture.EMPTY;
    }
  }

  destroy(options) {
    if (this.usesDirectInput) {
      this.off('pointertap', this.handleDirectTap);
      this.off('pointerdown', this.handleDirectDown);
      this.off('pointerup', this.handleDirectUp);
      this.off('pointerupoutside', this.handleDirectCancel);
      this.off('pointercancel', this.handleDirectCancel);
    }
    super.destroy(options);
  }
}

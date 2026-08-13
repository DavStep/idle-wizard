import { PIXI_UI_GEOMETRY } from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';

/**
 * Popup text tab built on the shared retained button contract.
 *
 * PixiButton owns input, press feedback, disabled state, semantics, haptics,
 * notifications, and activation. This subclass adds only popup-tab selection
 * skins and the compact 28px nine-slice geometry.
 */
export class PixiPopupTabButton extends PixiButton {
  constructor({
    height = PIXI_UI_GEOMETRY.tabHeight,
    label = 'popup-tab-button',
    ...options
  } = {}) {
    super({
      ...options,
      height,
      label,
      variant: 'tab',
    });
  }

  resolveRootRunVariant() {
    return this.selected ? 'brown-light' : 'brown-dark';
  }

  usesCompactSkinGeometry() {
    return this.buttonHeight <= PIXI_UI_GEOMETRY.tabHeight;
  }
}

import { PIXI_UI_GEOMETRY } from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';
import { getPixiButtonSkin } from './PixiButtonStyle.js';

export const PIXI_POPUP_TAB_BUTTON_COLORS = Object.freeze({
  resting: 'brown-dark',
  selected: 'brown',
});

export function getPixiPopupTabButtonSkin({
  height = PIXI_UI_GEOMETRY.tabHeight,
  selected = false,
  sizeTier = 50,
  width = null,
} = {}) {
  return getPixiButtonSkin({
    color: selected
      ? PIXI_POPUP_TAB_BUTTON_COLORS.selected
      : PIXI_POPUP_TAB_BUTTON_COLORS.resting,
    height,
    sizeTier,
    width,
  });
}

/**
 * Popup text tab built on the shared retained button contract.
 *
 * PixiButton owns input, press feedback, disabled state, semantics, haptics,
 * notifications, activation, and fitted skin geometry. This subclass adds
 * only popup-tab selection skins.
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
    return this.selected
      ? PIXI_POPUP_TAB_BUTTON_COLORS.selected
      : PIXI_POPUP_TAB_BUTTON_COLORS.resting;
  }
}

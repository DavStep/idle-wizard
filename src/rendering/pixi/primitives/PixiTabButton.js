import { PIXI_UI_GEOMETRY } from '../theme/PixiThemeTokens.js';
import { PixiTextButton } from './PixiTextButton.js';
import { getPixiButtonSkin } from './PixiButtonStyle.js';

export const PIXI_TAB_BUTTON_COLORS = Object.freeze({
  resting: 'brown-dark',
  selected: 'brown',
});

export function getPixiTabButtonSkin({
  height = PIXI_UI_GEOMETRY.tabHeight,
  selected = false,
  sizeTier = 50,
  width = null,
} = {}) {
  return getPixiButtonSkin({
    color: selected
      ? PIXI_TAB_BUTTON_COLORS.selected
      : PIXI_TAB_BUTTON_COLORS.resting,
    height,
    sizeTier,
    width,
  });
}

/**
 * Stateful text tab built from the shared text and base button contracts.
 */
export class PixiTabButton extends PixiTextButton {
  constructor({
    height = PIXI_UI_GEOMETRY.tabHeight,
    label = 'tab-button',
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
      ? PIXI_TAB_BUTTON_COLORS.selected
      : PIXI_TAB_BUTTON_COLORS.resting;
  }
}

import {
  Container,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';

import {
  DEFAULT_PIXI_THEME_SNAPSHOT,
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';
import { PixiNineSliceFrame } from './PixiNineSliceFrame.js';
import { PixiTextLabel } from './PixiTextLabel.js';

export const ROOT_RUN_AMOUNT_STEPPER_GEOMETRY = Object.freeze({
  width: 98,
  height: 34,
  buttonWidth: 30,
  fontSize: 18,
  minusIconWidth: 16,
  plusIconSize: 14,
});

/**
 * Connected Root Run quantity control.
 *
 * Callers own quantity rules and writes. The stepper owns only its retained
 * chrome, current value, enabled projection, and decrement/increment inputs.
 */
export class RootRunAmountStepper extends Container {
  constructor({
    assetManager,
    inputRouter = null,
    semanticRegistry = null,
    semanticId = 'amount',
    value = 0,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    enabled = true,
    onDecrement = null,
    onIncrement = null,
    label = 'rootRunAmountStepper',
  } = {}) {
    super({ label });
    this.assetManager = assetManager;
    this.stepperWidth = ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.width;
    this.stepperHeight = ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.height;
    this.min = 0;
    this.max = Number.MAX_SAFE_INTEGER;
    this.value = 0;
    this.enabled = true;

    this.backing = new PixiNineSliceFrame({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.amountStepperBacking,
        ) ??
        Texture.EMPTY,
      sourceInsets: PIXI_ROOT_RUN_GEOMETRY.amountStepper.sourceInsets,
      borderInsets: PIXI_ROOT_RUN_GEOMETRY.amountStepper.borderInsets,
      width: this.stepperWidth,
      height: this.stepperHeight,
      label: `${label}:backing`,
    });
    this.valueLabel = new PixiTextLabel({
      text: String(value),
      fontSize: ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.fontSize,
      fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif',
      anchor: { x: 0.5, y: 0.5 },
      color: '#634934',
      label: `${label}:value`,
    });
    this.decrement = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${semanticId}.decrement`,
      text: '',
      action: onDecrement,
      variant: 'yellow',
      label: `${label}:decrement`,
    });
    this.increment = new PixiButton({
      assetManager,
      inputRouter,
      semanticRegistry,
      semanticId: `${semanticId}.increment`,
      text: '',
      action: onIncrement,
      variant: 'yellow',
      label: `${label}:increment`,
    });
    this.decrementIcon = new Sprite({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.amountStepperMinus,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:decrementIcon`,
    });
    this.incrementIcon = new Sprite({
      texture:
        assetManager?.getTexture?.(
          PIXI_ROOT_RUN_ASSETS.amountStepperPlus,
        ) ?? Texture.EMPTY,
      anchor: 0.5,
      roundPixels: true,
      label: `${label}:incrementIcon`,
    });
    this.decrement.visual.addChild(this.decrementIcon);
    this.increment.visual.addChild(this.incrementIcon);
    this.addChild(
      this.backing,
      this.valueLabel,
      this.decrement,
      this.increment,
    );
    this.setValue({ value, min, max, enabled });
    this.setSize(this.stepperWidth, this.stepperHeight);
  }

  setValue({
    value = this.value,
    min = this.min,
    max = this.max,
    enabled = this.enabled,
  } = {}) {
    const safeMin = Math.max(0, Math.floor(Number(min) || 0));
    const safeMax = Math.max(
      safeMin,
      Math.floor(Number(max) || safeMin),
    );
    const safeValue = Math.min(
      safeMax,
      Math.max(safeMin, Math.floor(Number(value) || 0)),
    );
    this.min = safeMin;
    this.max = safeMax;
    this.value = safeValue;
    this.enabled = Boolean(enabled);
    this.valueLabel.setText(safeValue);
    this.decrement.setEnabled(this.enabled && safeValue > safeMin);
    this.increment.setEnabled(this.enabled && safeValue < safeMax);
    return this;
  }

  setSize(width, height = this.stepperHeight) {
    this.stepperWidth = Math.max(
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.buttonWidth * 2,
      Number(width) || 0,
    );
    this.stepperHeight = Math.max(0, Number(height) || 0);
    const buttonWidth = Math.min(
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.buttonWidth,
      this.stepperWidth / 2,
    );
    const buttonY = (this.stepperHeight - buttonWidth) / 2;

    this.backing.setSize(
      this.stepperWidth,
      this.stepperHeight,
      PIXI_ROOT_RUN_GEOMETRY.amountStepper.borderInsets,
    );
    this.decrement.position.set(0, buttonY);
    this.decrement.setSize(buttonWidth, buttonWidth);
    this.increment.position.set(this.stepperWidth - buttonWidth, buttonY);
    this.increment.setSize(buttonWidth, buttonWidth);
    this.decrementIcon.position.set(
      buttonWidth / 2,
      buttonWidth / 2,
    );
    this.decrementIcon.width =
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.minusIconWidth;
    this.decrementIcon.height =
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.minusIconWidth *
      (64 / 152);
    this.incrementIcon.position.set(
      buttonWidth / 2,
      buttonWidth / 2,
    );
    this.incrementIcon.width =
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.plusIconSize;
    this.incrementIcon.height =
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.plusIconSize;
    this.valueLabel.position.set(
      this.stepperWidth / 2,
      this.stepperHeight / 2,
    );
    this.hitArea = new Rectangle(0, 0, this.stepperWidth, this.stepperHeight);
    return this;
  }

  applyTheme(theme) {
    const snapshot = theme ?? DEFAULT_PIXI_THEME_SNAPSHOT;
    this.valueLabel.applyTheme(snapshot);
    this.decrement.applyTheme(snapshot);
    this.increment.applyTheme(snapshot);
    return this;
  }
}

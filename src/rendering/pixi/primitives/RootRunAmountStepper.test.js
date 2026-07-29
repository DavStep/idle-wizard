// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import {
  ROOT_RUN_AMOUNT_STEPPER_GEOMETRY,
  RootRunAmountStepper,
} from './RootRunAmountStepper.js';

installPixiPageTestCanvas();

describe('RootRunAmountStepper', () => {
  it('composes a light value rail with illustrated yellow end buttons', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const stepper = new RootRunAmountStepper({
      assetManager: { getTexture },
      value: 3,
      min: 0,
      max: 6,
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.amountStepperBacking,
    );
    expect(stepper.backing.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.amountStepper.sourceInsets,
    );
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.amountStepperMinus,
    );
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.amountStepperPlus,
    );
    expect(stepper.decrement.variant).toBe('yellow');
    expect(stepper.increment.variant).toBe('yellow');
    expect(stepper.decrement.textLabel.text).toBe('');
    expect(stepper.increment.textLabel.text).toBe('');
    expect(stepper.valueLabel.text).toBe('3');
    expect(stepper.decrement.x).toBe(0);
    expect(stepper.increment.x).toBe(
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.width -
        ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.buttonWidth,
    );
    expect(stepper.decrement.y).toBe(2);
    expect(stepper.increment.y).toBe(2);
    expect(stepper.decrement.buttonHeight).toBe(
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.buttonWidth,
    );
    expect(stepper.increment.buttonHeight).toBe(
      ROOT_RUN_AMOUNT_STEPPER_GEOMETRY.buttonWidth,
    );

    stepper.destroy({ children: true });
  });

  it('projects min, max, and caller-enabled state without owning writes', () => {
    const onDecrement = vi.fn(() => true);
    const onIncrement = vi.fn(() => true);
    const stepper = new RootRunAmountStepper({
      assetManager: { getTexture: vi.fn(() => Texture.EMPTY) },
      value: 1,
      min: 0,
      max: 2,
      onDecrement,
      onIncrement,
    });

    expect(stepper.decrement.activate()).toBe(true);
    expect(stepper.increment.activate()).toBe(true);
    expect(onDecrement).toHaveBeenCalledOnce();
    expect(onIncrement).toHaveBeenCalledOnce();

    stepper.setValue({ value: 0, min: 0, max: 2 });
    expect(stepper.valueLabel.text).toBe('0');
    expect(stepper.decrement.enabled).toBe(false);
    expect(stepper.increment.enabled).toBe(true);

    stepper.setValue({ value: 2, min: 0, max: 2 });
    expect(stepper.decrement.enabled).toBe(true);
    expect(stepper.increment.enabled).toBe(false);

    stepper.setValue({ enabled: false });
    expect(stepper.decrement.enabled).toBe(false);
    expect(stepper.increment.enabled).toBe(false);

    stepper.destroy({ children: true });
  });
});

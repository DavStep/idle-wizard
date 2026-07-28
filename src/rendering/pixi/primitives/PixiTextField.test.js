// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_ROOT_RUN_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiTextField } from './PixiTextField.js';

installPixiPageTestCanvas();

describe('PixiTextField', () => {
  it('uses the shared brown inset nine-slice by default', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const field = new PixiTextField({
      assetManager: { getTexture },
      width: 195,
      height: 27,
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.textFieldBrownInset,
    );
    expect(field.insetFrame.sourceInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.sourceInsets,
    );
    expect(field.insetFrame.borderInsets).toEqual(
      PIXI_ROOT_RUN_GEOMETRY.textFieldBrownInset.borderInsets,
    );
    expect(field.insetFrame.frameWidth).toBe(195);
    expect(field.insetFrame.frameHeight).toBe(27);
    expect(field.insetFrame.visible).toBe(true);
    expect(field.frame.visible).toBe(false);

    field.destroy({ children: true });
  });

  it('keeps the brown inset focus frame outside the writing area', () => {
    const field = new PixiTextField({
      assetManager: { getTexture: () => Texture.EMPTY },
      width: 195,
      height: 27,
    });

    field.focused = true;
    field.redrawTextState();

    const focusBounds = field.focusGraphic.getLocalBounds();
    const focusStroke = field.focusGraphic.context.instructions.at(-1);
    expect(focusBounds.x).toBeLessThan(0);
    expect(focusBounds.y).toBeLessThan(0);
    expect(focusBounds.width).toBeGreaterThan(field.fieldWidth);
    expect(focusBounds.height).toBeGreaterThan(field.fieldHeight);
    expect(focusStroke?.data?.style?.width).toBe(2);
    expect(field.textViewport.y).toBe(5);

    field.destroy({ children: true });
  });
});

// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  PIXI_ROOT_RUN_ASSETS,
  PIXI_UI_GEOMETRY,
} from '../theme/PixiThemeTokens.js';
import { PixiBaseButton } from './PixiBaseButton.js';
import { PixiTextButton } from './PixiTextButton.js';
import { getPixiButtonAssetId } from './PixiButtonStyle.js';

installPixiPageTestCanvas();

describe('PixiTextButton', () => {
  it('extends the label-free stateful base button', () => {
    const base = new PixiBaseButton();
    const button = new PixiTextButton({ text: 'Continue' });

    expect(base.textLabel).toBeUndefined();
    expect(button).toBeInstanceOf(PixiBaseButton);
    expect(button.textLabel.text).toBe('Continue');

    base.destroy({ children: true });
    button.destroy({ children: true });
  });

  it('selects color and corner size independently from one base widget', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiTextButton({
      assetManager: { getTexture },
      color: 'blue',
      sizeTier: 30,
      variant: 'regular',
    });

    expect(getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('blue', 30),
    );

    getTexture.mockClear();
    button.setColor('purple').setSizeTier(15);

    expect(button.color).toBe('purple');
    expect(button.sizeTier).toBe(15);
    expect(getTexture).toHaveBeenCalledWith(
      getPixiButtonAssetId('purple', 15),
    );

    button.destroy({ children: true });
  });

  it('uses the current brown regular-button skin for the default variant', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiTextButton({
      assetManager: { getTexture },
    });

    expect(button.resolveRootRunVariant()).toBe('brown');
    expect(getTexture).toHaveBeenCalledWith(
      'source:assets/ui/regular-button/brown-button-50.9.png',
    );

    button.destroy({ children: true });
  });

  it.each([
    { sizeTier: 50, width: 58, height: 36, expectedY: 15.916667 },
    { sizeTier: 30, width: 72, height: 42, expectedY: 19 },
    { sizeTier: 15, width: 46, height: 28, expectedY: 13 },
  ])(
    'centers tier-$sizeTier text above the authored bottom shadow',
    ({ sizeTier, width, height, expectedY }) => {
      const button = new PixiTextButton({
        assetManager: { getTexture: vi.fn(() => Texture.EMPTY) },
        text: 'Recipes',
        variant: 'yellow',
        sizeTier,
        width,
        height,
      });

      expect(button.textLabel.y).toBeCloseTo(expectedY, 5);
      expect(button.textLabel.y).toBeLessThan(height / 2);

      button.destroy({ children: true });
    },
  );

  it('keeps assetless inline labels geometrically centered', () => {
    const button = new PixiTextButton({
      text: 'Inline',
      variant: 'inline',
      width: 80,
      height: 30,
    });

    expect(button.textLabel.position).toMatchObject({ x: 40, y: 15 });

    button.destroy({ children: true });
  });

  it.each(['yellow', 'green', 'red', 'gray', 'brown-dark', 'brown-light'])(
    'uses the gray asset without a shader for disabled %s buttons',
    (variant) => {
      const getTexture = vi.fn(() => Texture.EMPTY);
      const button = new PixiTextButton({
        assetManager: { getTexture },
        variant,
      });

      getTexture.mockClear();
      button.setEnabled(false);

      expect(getTexture).toHaveBeenCalledWith(
        PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
      );
      expect(button.rootRunFrame.filters).toBeNull();

      button.destroy({ children: true });
    },
  );

  it('uses the red Root Run skin for enabled danger buttons', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiTextButton({
      assetManager: { getTexture },
      variant: 'red',
    });

    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonRedNineSlice,
    );

    button.destroy({ children: true });
  });

  it('keeps regular-button notifications tangent to the top-right edge', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiTextButton({
      assetManager: { getTexture },
      width: 100,
      height: 30,
      variant: 'green',
    });

    button.setNotification(true);

    expect(PIXI_UI_GEOMETRY).toMatchObject({
      notificationSize: 12,
      notificationOutset: 0,
      notificationTabInset: 4,
    });
    expect(button.notificationBadge.root.position).toMatchObject({
      x: 94,
      y: 6,
    });

    button.destroy({ children: true });
  });
});

// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import {
  createPixiThemeSnapshot,
  PIXI_ROOT_RUN_ASSETS,
} from '../theme/PixiThemeTokens.js';
import { PixiButton } from './PixiButton.js';

installPixiPageTestCanvas();

describe('PixiButton', () => {
  it.each(['yellow', 'green', 'gray', 'brown-dark', 'brown-light'])(
    'uses the gray asset without a shader for disabled %s buttons',
    (variant) => {
      const getTexture = vi.fn(() => Texture.EMPTY);
      const button = new PixiButton({
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

  it('uses the current Root Run brown skins for popup tabs in every player theme', () => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const button = new PixiButton({
      assetManager: { getTexture },
      variant: 'tab',
    });

    getTexture.mockClear();
    button.applyTheme(createPixiThemeSnapshot({ theme: 'black' }));
    expect(button.resolveRootRunVariant()).toBe('brown-dark');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownDark,
    );

    getTexture.mockClear();
    button.setSelected(true);
    expect(button.resolveRootRunVariant()).toBe('brown-light');
    expect(getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.buttonBrownLight,
    );

    button.destroy({ children: true });
  });
});

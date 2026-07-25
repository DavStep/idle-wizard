// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';
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

      button.setEnabled(false);

      expect(getTexture).toHaveBeenLastCalledWith(
        PIXI_ROOT_RUN_ASSETS.buttonGrayNineSlice,
      );
      expect(button.rootRunFrame.filters).toBeNull();

      button.destroy({ children: true });
    },
  );
});

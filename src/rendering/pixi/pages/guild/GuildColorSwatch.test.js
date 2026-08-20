// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import '../workshop/PixiPageTestHarness.js';
import { PIXI_ROOT_RUN_ASSETS } from '../../theme/PixiThemeTokens.js';
import { GuildColorSwatch } from './GuildDialogPixi.js';

describe('GuildColorSwatch', () => {
  it('shows the shared checkmark only for the selected color', () => {
    const checkmarkTexture = new Texture();
    const assetManager = {
      getTexture: vi.fn(() => checkmarkTexture),
    };
    const swatch = new GuildColorSwatch({
      assetManager,
      colorId: 'violet',
      label: 'selected-color',
    });

    swatch.setBounds(0, 0, 20);
    expect(assetManager.getTexture).toHaveBeenCalledWith(
      PIXI_ROOT_RUN_ASSETS.checkmark,
    );
    expect(swatch.checkmark.visible).toBe(false);

    swatch.setSelected(true);
    expect(swatch.checkmark.visible).toBe(true);
    expect(swatch.checkmark.renderable).toBe(true);
    expect(swatch.checkmark.width).toBeCloseTo(14.4);

    swatch.setSelected(false);
    expect(swatch.checkmark.visible).toBe(false);
    expect(swatch.checkmark.renderable).toBe(false);

    swatch.destroy();
  });
});

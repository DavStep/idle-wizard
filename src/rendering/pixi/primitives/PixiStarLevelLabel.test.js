// @vitest-environment jsdom

import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';

import { installPixiPageTestCanvas } from '../pages/workshop/PixiPageTestHarness.js';
import { PIXI_ROOT_RUN_ASSETS } from '../theme/PixiThemeTokens.js';
import { PixiStarLevelLabel } from './PixiStarLevelLabel.js';

installPixiPageTestCanvas();

describe('PixiStarLevelLabel', () => {
  it.each([
    [13, 'blue', 1, PIXI_ROOT_RUN_ASSETS.starBlue],
    [16, 'green', 1, PIXI_ROOT_RUN_ASSETS.starGreen],
    [19, 'silver', 1, PIXI_ROOT_RUN_ASSETS.starSilver],
    [20, 'silver', 2, PIXI_ROOT_RUN_ASSETS.starSilver],
    [21, 'silver', 2, PIXI_ROOT_RUN_ASSETS.starSilver],
  ])('maps level %s to the retained %s tier', (level, tone, starCount, assetId) => {
    const getTexture = vi.fn(() => Texture.EMPTY);
    const label = new PixiStarLevelLabel({
      assetManager: {
        getTexture,
        has: () => true,
      },
      level,
    });

    expect(label.tone).toBe(tone);
    expect(label.starCount).toBe(starCount);
    expect(label.accessibleLabel).toBe(`${tone} star ${starCount}`);
    expect(getTexture).toHaveBeenCalledWith(assetId);

    label.destroy({ children: true });
  });
});
